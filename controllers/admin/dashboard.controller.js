import User from "../../models/user.model.js"
import Order from "../../models/order.model.js"





export const renderDashboardPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const filter = req.query.filter || 'all_time';
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        let matchStage = { 'products.status': 'delivered' };

        const now = new Date();
        if (filter === 'today') {
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);
            matchStage.createdAt = { $gte: startOfDay, $lte: endOfDay };
        } else if (filter === 'this_week') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            matchStage.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
        } else if (filter === 'this_month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            matchStage.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
        } else if (filter === 'this_year') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const endOfYear = new Date(now.getFullYear(), 11, 31);
            matchStage.createdAt = { $gte: startOfYear, $lte: endOfYear };
        } else if (filter === 'custom') {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = startDate;
            if (endDate) matchStage.createdAt.$lte = endDate;
        }

        const totalsPipeline = [
            { $unwind: '$products' },
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: '$products.total_amount' },
                    totalDiscount: { $sum: { $subtract: ['$products.total_amount', '$products.amount_after_coupon'] } }
                }
            }
        ];

        const chartPipeline = [
            { $unwind: '$products' },
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        date: '$createdAt'
                    },
                    total_amount: { $sum: '$products.total_amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } } 
        ];

        const tablePipeline = [
            { $unwind: '$products' },
            { $match: matchStage },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$_id',
                    user_name: { $first: '$user.name' },
                    createdAt: { $first: '$createdAt' },
                    payment_method: { $first: '$payment_method' },
                    products: { $push: '$products' },
                    productDetails: { $push: '$productDetails' }
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ];


        const [totalsData, chartData, orders] = await Promise.all([
            Order.aggregate(totalsPipeline),
            Order.aggregate(chartPipeline),
            Order.aggregate(tablePipeline)
        ]);


        const totals = totalsData[0] || { totalSales: 0, totalRevenue: 0, totalDiscount: 0 };


        const salesData = orders.flatMap(order =>
            order.products.map((product, index) => ({
                ...order,
                product: order.productDetails[index],
                product_id: product.product_id,
                quantity: product.quantity,
                total_amount: product.total_amount,
                discount_amount: product.total_amount - product.amount_after_coupon,
            }))
        );


        let processedChartData;
        if (filter === 'all_time') {
            const yearlyData = {};
            chartData.forEach(record => {
                const year = new Date(record._id.date).getFullYear();
                if (!yearlyData[year]) {
                    yearlyData[year] = { sales: 0, revenue: 0, orders: 0 };
                }
                yearlyData[year].sales += record.count;
                yearlyData[year].revenue += record.total_amount;
                yearlyData[year].orders += record.count;
            });
            processedChartData = Object.keys(yearlyData)
                .map(year => ({
                    date: year,
                    sales: yearlyData[year].sales,
                    revenue: yearlyData[year].revenue,
                    orders: yearlyData[year].orders
                }))
                .sort((a, b) => parseInt(a.date) - parseInt(b.date)); 
        } else if (filter === 'this_year') {
            const months = [...Array(12)].map((_, i) => new Date(2000, i).toLocaleString('en', { month: 'short' }));
            const monthlyData = {};
            chartData.forEach(record => {
                const date = new Date(record._id.date);
                if (date.getFullYear() === now.getFullYear()) {
                    const monthIndex = date.getMonth();
                    if (!monthlyData[monthIndex]) {
                        monthlyData[monthIndex] = { sales: 0, revenue: 0, orders: 0 };
                    }
                    monthlyData[monthIndex].sales += record.count;
                    monthlyData[monthIndex].revenue += record.total_amount;
                    monthlyData[monthIndex].orders += record.count;
                }
            });
            processedChartData = months.map((month, index) => ({
                date: month,
                sales: monthlyData[index]?.sales || 0,
                revenue: monthlyData[index]?.revenue || 0,
                orders: monthlyData[index]?.orders || 0
            }));
        } else if (filter === 'today') {
            processedChartData = chartData.map(record => ({
                date: new Date(record._id.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                sales: record.count,
                revenue: record.total_amount,
                orders: record.count
            }));
        } else if (filter === 'this_week' || filter === 'this_month' || filter === 'custom') {
            processedChartData = chartData.map(record => ({
                date: new Date(record._id.date).toLocaleDateString(),
                sales: record.count,
                revenue: record.total_amount,
                orders: record.count
            }));
        }

        const userCount = await User.countDocuments({ role: "user" });
        const totalPages = Math.ceil(totals.totalSales / limit);

        return res.render("admin/dashboard", {
            salesData,
            userCount,
            totalSalesCount: totals.totalSales,
            totalRevenue: totals.totalRevenue,
            totalDiscount: totals.totalDiscount,
            netRevenue: totals.totalRevenue - totals.totalDiscount,
            page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            chartData: processedChartData,
            filter,
            startDate: req.query.startDate || '',
            endDate: req.query.endDate || ''
        });

    } catch (error) {
        console.error("Error fetching sales data:", error);
        return res.status(500).send("Internal Server Error");
    }
};




export const salesData = async (req, res) => {
    try {
        const filter = req.query.filter || 'all_time';
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        let matchStage = { 'products.status': 'delivered' };

        const now = new Date();
        if (filter === 'today') {
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);
            matchStage.createdAt = { $gte: startOfDay, $lte: endOfDay };
        } else if (filter === 'this_week') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            matchStage.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
        } else if (filter === 'this_month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            matchStage.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
        } else if (filter === 'this_year') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const endOfYear = new Date(now.getFullYear(), 11, 31);
            matchStage.createdAt = { $gte: startOfYear, $lte: endOfYear };
        } else if (filter === 'custom') {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = startDate;
            if (endDate) matchStage.createdAt.$lte = endDate;
        }

        const totalsPipeline = [
            { $unwind: '$products' },
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: '$products.total_amount' },
                    totalDiscount: { $sum: { $subtract: ['$products.total_amount', '$products.amount_after_coupon'] } }
                }
            }
        ];

        const tablePipeline = [
            { $unwind: '$products' },
            { $match: matchStage },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$_id',
                    user_name: { $first: '$user.name' },
                    createdAt: { $first: '$createdAt' },
                    payment_method: { $first: '$payment_method' },
                    products: { $push: '$products' },
                    productDetails: { $push: '$productDetails' }
                }
            },
            { $sort: { createdAt: -1 } }
        ];

        const [totalsData, orders] = await Promise.all([
            Order.aggregate(totalsPipeline),
            Order.aggregate(tablePipeline)
        ]);

        const totals = totalsData[0] || { totalSales: 0, totalRevenue: 0, totalDiscount: 0 };

        const salesData = orders.flatMap(order =>
            order.products.map((product, index) => ({
                ...order,
                product: order.productDetails[index],
                product_id: product.product_id,
                quantity: product.quantity,
                total_amount: product.total_amount,
                discount_amount: product.total_amount - product.amount_after_coupon,
            }))
        );

        res.json({
            totals,
            salesData
        });
    } catch (error) {
        console.error("Error fetching all sales data:", error);
        res.status(500).send("Internal Server Error");
    }
};

































// 2-2 2025

// export const renderDashboardPage = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = 10; 
//         const skip = (page - 1) * limit;
//         const filter = req.query.filter || 'all_time';
//         const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
//         const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

//         let matchStage = { 'products.status': 'delivered' };

//         if (filter === 'today') {
//             const startOfDay = new Date();
//             startOfDay.setHours(0, 0, 0, 0);
//             const endOfDay = new Date(startOfDay);
//             endOfDay.setHours(23, 59, 59, 999);
//             matchStage.createdAt = { $gte: startOfDay, $lte: endOfDay };
//         } else if (filter === 'this_week') {
//             const startOfWeek = new Date();
//             startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
//             startOfWeek.setHours(0, 0, 0, 0);
//             const endOfWeek = new Date(startOfWeek);
//             endOfWeek.setDate(startOfWeek.getDate() + 6);
//             endOfWeek.setHours(23, 59, 59, 999);
//             matchStage.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
//         } else if (filter === 'this_month') {
//             const startOfMonth = new Date();
//             startOfMonth.setDate(1);
//             startOfMonth.setHours(0, 0, 0, 0);
//             const endOfMonth = new Date(startOfMonth);
//             endOfMonth.setMonth(startOfMonth.getMonth() + 1);
//             endOfMonth.setDate(0); 
//             endOfMonth.setHours(23, 59, 59, 999);
//             matchStage.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
//         } else if (filter === 'this_year') {
//             const startOfYear = new Date();
//             startOfYear.setMonth(0, 1);
//             startOfYear.setHours(0, 0, 0, 0);
//             const endOfYear = new Date(startOfYear);
//             endOfYear.setFullYear(startOfYear.getFullYear() + 1);
//             endOfYear.setDate(0); 
//             endOfYear.setHours(23, 59, 59, 999);
//             matchStage.createdAt = { $gte: startOfYear, $lte: endOfYear };
//         } else if (filter === 'custom') {
//             if (startDate) matchStage.createdAt = { $gte: startDate };
//             if (endDate) {
//                 matchStage.createdAt = matchStage.createdAt || {};
//                 matchStage.createdAt.$lte = endDate;
//             }
//         } else {
//             // No additional match stage needed for all_time
//         }

//         // Ensure no data before 2024, unless custom filter is used
//         const year2024 = new Date('2024-01-01T00:00:00Z');
//         if (filter !== 'custom') {
//             matchStage.createdAt = matchStage.createdAt || {};
//             matchStage.createdAt.$gte = matchStage.createdAt.$gte || year2024;
//         }

//         // Get the total count of delivered products and aggregate necessary data
//         const aggregatePipeline = [
//             { $unwind: '$products' },
//             { $match: matchStage },
//             {
//                 $group: {
//                     _id: null,
//                     totalOrders: { $sum: 1 },
//                     totalRevenue: { $sum: '$products.total_amount' },
//                     totalDiscount: { $sum: '$products.discount_amount' }
//                 }
//             }
//         ];

//         const [aggregateData] = await Order.aggregate(aggregatePipeline);
//         const totalOrders = aggregateData ? aggregateData.totalOrders : 0;
//         const totalRevenue = aggregateData ? aggregateData.totalRevenue : 0;
//         const totalDiscount = aggregateData ? aggregateData.totalDiscount : 0;
//         const netRevenue = totalRevenue - totalDiscount;

//         console.log('Total Orders:', totalOrders);
//         console.log('Total Revenue:', totalRevenue);
//         console.log('Total Discount:', totalDiscount);
//         console.log('Net Revenue:', netRevenue);

//         const pipeline = [
//             { $unwind: '$products' },
//             { $match: matchStage },
//             {
//                 $lookup: {
//                     from: 'users',
//                     localField: 'user_id',
//                     foreignField: '_id',
//                     as: 'user'
//                 }
//             },
//             { $unwind: '$user' },
//             {
//                 $lookup: {
//                     from: 'products',
//                     localField: 'products.product_id',
//                     foreignField: '_id',
//                     as: 'productDetails'
//                 }
//             },
//             { $unwind: '$productDetails' },
//             {
//                 $group: {
//                     _id: '$_id',
//                     user_name: { $first: '$user.name' },
//                     createdAt: { $first: '$createdAt' },
//                     payment_method: { $first: '$payment_method' },
//                     products: { $push: '$products' },
//                     productDetails: { $push: '$productDetails' }
//                 }
//             },
//             { $sort: { createdAt: -1 } },
//             { $skip: skip },
//             { $limit: limit }
//         ];

//         const orders = await Order.aggregate(pipeline);
//         const salesData = orders.flatMap(order => 
//             order.products.map((product, index) => ({
//                 ...order,
//                 product: order.productDetails[index],
//                 product_id: product.product_id,
//                 quantity: product.quantity,
//                 total_amount: product.total_amount,
//                 discount_amount: product.discount_amount
//             }))
//         ).slice(0, limit);

//         const userCount = await User.countDocuments({ role: "user" });

//         const totalPages = Math.ceil(totalOrders / limit);
//         const hasNextPage = page < totalPages;
//         const hasPrevPage = page > 1;

//         const chartData = orders.map(order => {
//             const date = new Date(order.createdAt);
//             return {
//                 date: filter === 'today' ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
//                       filter === 'this_week' || filter === 'this_month' ? date.toLocaleDateString() :
//                       filter === 'this_year' ? date.toLocaleString('default', { month: 'long' }) :
//                       date.getFullYear(),
//                 orders: order.products.length,
//                 revenue: order.products.reduce((sum, product) => sum + product.total_amount, 0)
//             };
//         });

//         return res.render("admin/dashboard", {
//             salesData,
//             userCount,
//             totalOrders,
//             totalRevenue,
//             totalDiscount,
//             netRevenue,
//             page,
//             totalPages,
//             hasNextPage,
//             hasPrevPage,
//             chartData,
//             filter,
//             startDate: req.query.startDate || '',
//             endDate: req.query.endDate || ''
//         });
//     } catch (error) {
//         console.error("Error fetching sales data:", error);
//         return res.status(500).send("Internal Server Error");
//     }
// };

// <html lang="en">
// <%- include('partials/head') %>

// <body>
//     <%
//     let totalOrders = 0;
//     let totalRevenue = 0;
//     let totalDiscount = 0;

//     salesData.forEach(order => {
//         totalOrders += 1; // Count each delivered product as an order
//         totalRevenue += order.total_amount || 0;
//         totalDiscount += order.discount_amount || 0;
//     });

//     // Reverse the chartData array to make the latest data appear on the right side
//     const reversedChartData = chartData.reverse();
//     %>

//     <div class="main-content">
//         <div class="header">
//             <div class="search-bar">
//                 <form action="/search" method="GET">
//                     <input type="text" name="search" placeholder="Search">
//                 </form>
//             </div>
//             <div class="admin-profile mx-3">
//                 <a href="/admin/settings">
//                     <i class="fa-solid fa-circle-user"></i>
//                 </a>
//             </div>
//         </div>
//         <div class="breadcrumbs">breadcrumbs</div>

//         <div class="dashboard-summary-container">
//             <div class="row">
//                 <div class="col-12 pe-3 dashboard-summary">
//                     <div class="dashboard-summary1">
//                         <h3>Total Users</h3>
//                         <p><%= userCount %></p>
//                         <p1>
//                             <i class="fa-solid fa-chart-simple"></i>
//                             <p2>Active Users</p2>
//                         </p1>
//                     </div>
//                     <div class="dashboard-summary2">
//                         <h3>Total Orders</h3>
//                         <p id="total-orders"><%= totalOrders %></p>
//                         <p1>
//                             <i class="fa-solid fa-chart-simple"></i>
//                             <p2>Delivered Orders</p2>
//                         </p1>
//                     </div>
//                     <div class="dashboard-summary3">
//                         <h3>Total Revenue</h3>
//                         <p id="gross-revenue">₹ <%= totalRevenue.toFixed(2) %></p>
//                         <p2>
//                             <i class="fa-solid fa-chart-simple"></i> From Delivered Orders
//                         </p2>
//                     </div>
//                     <div class="dashboard-summary3">
//                         <h3>Total Discount</h3>
//                         <p id="total-discount">₹ <%= totalDiscount.toFixed(2) %></p>
//                         <p2>
//                             <i class="fa-solid fa-chart-simple"></i> Applied Discounts
//                         </p2>
//                     </div>
//                     <div class="dashboard-summary3">
//                         <h3>Net Revenue</h3>
//                         <p id="net-revenue">₹ <%= (totalRevenue - totalDiscount).toFixed(2) %></p>
//                         <p2>
//                             <i class="fa-solid fa-chart-simple"></i> After Discounts
//                         </p2>
//                     </div>
//                 </div>
//             </div>
        
//             <div class="row">
//                 <div class="col-8">
//                     <div class="chart-wrapper">
//                         <div class="chart-container">
//                             <div class="filter-container">
//                                 <div class="download">
//                                     <button id="download-pdf" class="download-pdf me-2">Download PDF</button>
//                                     <button id="download-excel" class="download-excel">Download Excel</button>
//                                 </div>
//                                 <select id="filter" class="filter-select" onchange="applyFilter(this.value)">
//                                     <option value="all_time" <%= filter === 'all_time' ? 'selected' : '' %>>All Time</option>
//                                     <option value="today" <%= filter === 'today' ? 'selected' : '' %>>Today</option>
//                                     <option value="this_week" <%= filter === 'this_week' ? 'selected' : '' %>>This Week</option>
//                                     <option value="this_month" <%= filter === 'this_month' ? 'selected' : '' %>>This Month</option>
//                                     <option value="this_year" <%= filter === 'this_year' ? 'selected' : '' %>>This Year</option>
//                                     <option value="custom" <%= filter === 'custom' ? 'selected' : '' %>>Custom</option>
//                                 </select>
//                                 <div id="custom-date-range" style="display: <%= filter === 'custom' ? 'inline-block' : 'none' %>;">
//                                     <input type="date" id="start-date" class="date-input" value="<%= startDate %>">
//                                     <input type="date" id="end-date" class="date-input" value="<%= endDate %>">
//                                     <button id="apply-custom-filter" onclick="applyCustomFilter()" class="apply-btn">Apply</button>
//                                 </div>
//                                 <button id="toggleChart" class="toggle-btn"><i class="fas fa-chart-bar"></i></button>
//                             </div>
//                             <canvas id="salesChart"></canvas>
//                         </div>
//                     </div>
//                 </div>
//                 <div class="col-4">
//                     <div class="chart-wrapper">
//                         <div class="chart-container">
//                             <h6>Payment Methods</h6>
//                             <canvas id="paymentMethodsChart"></canvas>
//                         </div>
//                     </div>
//                 </div>
//             </div>
        
//             <div class="table-container">
//                 <h2>Sales Data (Delivered Orders)</h2>
//                 <table class="all-table">
//                     <thead>
//                         <tr>
//                             <th>Order ID</th>
//                             <th>Customer</th>
//                             <th>Product</th>
//                             <th>Quantity</th>
//                             <th>Amount</th>
//                             <th>Discount</th>
//                             <th>Date</th>
//                         </tr>
//                     </thead>
//                     <tbody id="sales-table-body">
//                         <% salesData.forEach(order => { %>
//                             <tr>
//                                 <td><%= order._id %></td>
//                                 <td><%= order.user_name %></td>
//                                 <td><%= order.product.title %></td>
//                                 <td><%= order.quantity || 0 %></td>
//                                 <td>₹ <%= (order.total_amount || 0) %></td>
//                                 <td>₹ <%= (order.discount_amount || 0) %></td>
//                                 <td><%= new Date(order.createdAt).toLocaleString() %></td>
//                             </tr>
//                         <% }); %>
//                     </tbody>
//                 </table>
//                 <div class="d-flex justify-content-center    align-items-center">
//                     <nav aria-label="Page navigation" class="d-flex justify-content-between align-items-center mb-4">
                    
//                         <ul class="pagination mb-0">
//                             <% if (typeof hasPrevPage !== 'undefined' && hasPrevPage) { %>
//                                 <li class="page-item">
//                                     <a class="page-link" href="?page=<%= page - 1 %>&filter=<%= filter %>&startDate=<%= startDate %>&endDate=<%= endDate %>" aria-label="Previous">
//                                         <span aria-hidden="true">&laquo;</span>
//                                     </a>
//                                 </li>
//                             <% } %>
                            
//                             <% 
//                             const currentPage = typeof page !== 'undefined' ? page : 1;
//                             const totalPagesCount = typeof totalPages !== 'undefined' ? totalPages : 1;
//                             let startPage = Math.max(1, currentPage - 2);
//                             let endPage = Math.min(totalPagesCount, startPage + 4);
//                             if (endPage - startPage < 4) {
//                                 startPage = Math.max(1, endPage - 4);
//                             }
//                             %>
                            
//                             <% for(let i = startPage; i <= endPage; i++) { %>
//                                 <li class="page-item <%= currentPage === i ? 'active' : '' %>">
//                                     <a class="page-link" href="?page=<%= i %>&filter=<%= filter %>&startDate=<%= startDate %>&endDate=<%= endDate %>"><%= i %></a>
//                                 </li>
//                             <% } %>
                            
//                             <% if (typeof hasNextPage !== 'undefined' && hasNextPage) { %>
//                                 <li class="page-item">
//                                     <a class="page-link" href="?page=<%= currentPage + 1 %>&filter=<%= filter %>&startDate=<%= startDate %>&endDate=<%= endDate %>" aria-label="Next">
//                                         <span aria-hidden="true">&raquo;</span>
//                                     </a>
//                                 </li>
//                             <% } %>
//                         </ul>
//                     </nav>
//                 </div>
                

//                 <script>
//                     function applyFilter(filter) {
//                         const url = new URL(window.location.href);
//                         url.searchParams.set('filter', filter);
//                         if (filter !== 'custom') {
//                             url.searchParams.delete('startDate');
//                             url.searchParams.delete('endDate');
//                         }
//                         window.location.href = url.toString();
//                     }
                
//                     function applyCustomFilter() {
//                         const filter = 'custom';
//                         const startDate = document.getElementById('start-date').value;
//                         const endDate = document.getElementById('end-date').value;
//                         const url = new URL(window.location.href);
//                         url.searchParams.set('filter', filter);
//                         if (startDate) url.searchParams.set('startDate', startDate);
//                         if (endDate) url.searchParams.set('endDate', endDate);
//                         window.location.href = url.toString();
//                     }
                
//                     document.addEventListener('DOMContentLoaded', function () {
//                         const salesData = <%- JSON.stringify(salesData || []) %>;
//                         const chartData = <%- JSON.stringify(reversedChartData || []) %>;
                
//                         // Process payment methods from sales data
//                         const paymentMethods = {};
//                         salesData.forEach(order => {
//                             const method = order.payment_method || 'unknown';
//                             paymentMethods[method] = (paymentMethods[method] || 0) + 1;
//                         });
                
//                         const paymentMethodsData = Object.entries(paymentMethods).map(([method, count]) => ({
//                             _id: method,
//                             count: count
//                         }));
                
//                         // Sales Chart
//                         const ctx = document.getElementById('salesChart').getContext('2d');
//                         let currentChartType = 'bar';
//                         let chart;
                
//                         function createChart(type) {
//                             if (chart) {
//                                 chart.destroy();
//                             }
//                             chart = new Chart(ctx, {
//                                 type: type,
//                                 data: {
//                                     labels: chartData.map(d => d.date),
//                                     datasets: [
//                                         {
//                                             label: 'Revenue (₹) and Orders',
//                                             data: chartData.map(d => ({ x: d.date, y: d.revenue, orders: d.orders })),
//                                             borderColor: '#d81b60',
//                                             backgroundColor: 'rgba(232, 55, 146, 0.5)',
//                                             borderWidth: 2,
//                                             fill: true,
//                                             tension: 0.1
//                                         }
//                                     ]
//                                 },
//                                 options: {
//                                     responsive: true,
//                                     scales: {
//                                         y: {
//                                             beginAtZero: true,
//                                             title: {
//                                                 display: true,
//                                                 text: 'Revenue (₹)',
//                                                 color: 'rgba(255, 255, 255, 0.7)'
//                                             },
//                                             grid: {
//                                                 color: 'rgba(255, 255, 255, 0.1)'
//                                             },
//                                             ticks: {
//                                                 color: 'rgba(255, 255, 255, 0.7)'
//                                             }
//                                         },
//                                         x: {
//                                             title: {
//                                                 display: true,
//                                                 text: '<%= filter === "today" ? "Time" : (filter === "this_week" ? "Day" : (filter === "this_month" ? "Day" : (filter === "this_year" ? "Month" : "Year"))) %>',
//                                                 color: 'rgba(255, 255, 255, 0.7)'
//                                             },
//                                             grid: {
//                                                 color: 'rgba(255, 255, 255, 0.1)'
//                                             },
//                                             ticks: {
//                                                 color: 'rgba(255, 255, 255, 0.7)'
//                                             }
//                                         }
//                                     },
//                                     plugins: {
//                                         tooltip: {
//                                             callbacks: {
//                                                 label: function(context) {
//                                                     const { revenue, orders } = chartData[context.dataIndex];
//                                                     return `Revenue: ₹${revenue} | Products: ${orders}`;
//                                                 }
//                                             }
//                                         }
//                                     }
//                                 }
//                             });
//                         }
                
//                         createChart(currentChartType);
                
//                         document.getElementById('toggleChart').addEventListener('click', function() {
//                             currentChartType = currentChartType === 'bar' ? 'line' : 'bar';
//                             createChart(currentChartType);
//                         });
                
//                         // Payment Methods Chart
//                         const paymentCtx = document.getElementById('paymentMethodsChart').getContext('2d');
//                         new Chart(paymentCtx, {
//                             type: 'doughnut',
//                             data: {
//                                 labels: paymentMethodsData.map(d => d._id.toUpperCase()),
//                                 datasets: [{
//                                     data: paymentMethodsData.map(d => d.count),
//                                     backgroundColor: [
//                                         '#5c6bc0',  // Indigo Blue
//                                         '#26c6da',  // Cyan
//                                         '#ec407a',  // Pink
//                                         '#ffa726',  // Orange
//                                         '#66bb6a',  // Green
//                                         '#7e57c2'   // Purple
//                                     ],
//                                     borderColor: [
//                                         '#4a59a7',  // Darker Indigo
//                                         '#1ea7b8',  // Darker Cyan
//                                         '#d81b60',  // Darker Pink
//                                         '#fb8c00',  // Darker Orange
//                                         '#43a047',  // Darker Green
//                                         '#673ab7'   // Darker Purple
//                                     ],
//                                     borderWidth: 2
//                                 }]
//                             },
//                             options: {
//                                 responsive: true,
//                                 plugins: {
//                                     legend: {
//                                         position: 'top',
//                                     },
//                                     tooltip: {
//                                         callbacks: {
//                                             label: function(context) {
//                                                 const data = paymentMethodsData[context.dataIndex];
//                                                 const percentage = ((data.count / paymentMethodsData.reduce((a, b) => a + b.count, 0)) * 100).toFixed(1);
//                                                 return `${data._id.toUpperCase()}: ${data.count} orders (${percentage}%)`;
//                                             }
//                                         }
//                                     }
//                                 }
//                             }
//                         });
//                     });
//                 </script>
//             </div>
//         </div>
//     </div>

//     <%- include('partials/footer') %>

// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js"></script>
// </body>
// </html>

{/* <html lang="en">
<%- include('partials/head') %>

<body>
    <%
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalDiscount = 0;

    salesData.forEach(order => {
        totalOrders += 1; // Count each delivered product as an order
        totalRevenue += order.total_amount || 0;
        totalDiscount += order.discount_amount || 0;
    });

    // Reverse the chartData array to make the latest data appear on the right side
    const reversedChartData = chartData.reverse();
    %>

    <div class="main-content">
        <div class="header">
            <div class="search-bar">
                <form action="/search" method="GET">
                    <input type="text" name="search" placeholder="Search">
                </form>
            </div>
            <div class="admin-profile mx-3">
                <a href="/admin/settings">
                    <i class="fa-solid fa-circle-user"></i>
                </a>
            </div>
        </div>
        <div class="breadcrumbs">breadcrumbs</div>

        <div class="dashboard-summary-container">
            <div class="row">
                <div class="col-12 pe-3 dashboard-summary">
                    <div class="dashboard-summary1">
                        <h3>Total Users</h3>
                        <p><%= userCount %></p>
                        <p1>
                            <i class="fa-solid fa-chart-simple"></i>
                            <p2>Active Users</p2>
                        </p1>
                    </div>
                    <div class="dashboard-summary2">
                        <h3>Total Orders</h3>
                        <p id="total-orders"><%= totalOrders %></p>
                        <p1>
                            <i class="fa-solid fa-chart-simple"></i>
                            <p2>Delivered Orders</p2>
                        </p1>
                    </div>
                    <div class="dashboard-summary3">
                        <h3>Total Revenue</h3>
                        <p id="gross-revenue">₹ <%= totalRevenue.toFixed(2) %></p>
                        <p2>
                            <i class="fa-solid fa-chart-simple"></i> From Delivered Orders
                        </p2>
                    </div>
                    <div class="dashboard-summary3">
                        <h3>Total Discount</h3>
                        <p id="total-discount">₹ <%= totalDiscount.toFixed(2) %></p>
                        <p2>
                            <i class="fa-solid fa-chart-simple"></i> Applied Discounts
                        </p2>
                    </div>
                    <div class="dashboard-summary3">
                        <h3>Net Revenue</h3>
                        <p id="net-revenue">₹ <%= (totalRevenue - totalDiscount).toFixed(2) %></p>
                        <p2>
                            <i class="fa-solid fa-chart-simple"></i> After Discounts
                        </p2>
                    </div>
                </div>
            </div>
        
            <div class="row">
                <div class="col-8">
                    <div class="chart-wrapper">
                        <div class="chart-container">
                            <div class="filter-container">
                                <div class="download">
                                    <button id="download-pdf" class="download-pdf me-2">Download PDF</button>
                                    <button id="download-excel" class="download-excel">Download Excel</button>
                                </div>
                                <select id="filter" class="filter-select" onchange="applyFilter(this.value)">
                                    <option value="all_time" <%= filter === 'all_time' ? 'selected' : '' %>>All Time</option>
                                    <option value="today" <%= filter === 'today' ? 'selected' : '' %>>Today</option>
                                    <option value="this_week" <%= filter === 'this_week' ? 'selected' : '' %>>This Week</option>
                                    <option value="this_month" <%= filter === 'this_month' ? 'selected' : '' %>>This Month</option>
                                    <option value="this_year" <%= filter === 'this_year' ? 'selected' : '' %>>This Year</option>
                                    <option value="custom" <%= filter === 'custom' ? 'selected' : '' %>>Custom</option>
                                </select>
                                <div id="custom-date-range" style="display: <%= filter === 'custom' ? 'inline-block' : 'none' %>;">
                                    <input type="date" id="start-date" class="date-input" value="<%= startDate %>">
                                    <input type="date" id="end-date" class="date-input" value="<%= endDate %>">
                                    <button id="apply-custom-filter" onclick="applyCustomFilter()" class="apply-btn">Apply</button>
                                </div>
                                <button id="toggleChart" class="toggle-btn"><i class="fas fa-chart-bar"></i></button>
                            </div>
                            <canvas id="salesChart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="chart-wrapper">
                        <div class="chart-container">
                            <h6>Payment Methods Distribution</h6>
                            <canvas id="paymentMethodsChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        
            <div class="table-container">
                <h2>Sales Data (Delivered Orders)</h2>
                <table class="all-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Amount</th>
                            <th>Discount</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody id="sales-table-body">
                        <% salesData.forEach(order => { %>
                            <tr>
                                <td><%= order._id %></td>
                                <td><%= order.user_name %></td>
                                <td><%= order.product.title %></td>
                                <td><%= order.quantity || 0 %></td>
                                <td>₹ <%= (order.total_amount || 0) %></td>
                                <td>₹ <%= (order.discount_amount || 0) %></td>
                                <td><%= new Date(order.createdAt).toLocaleString() %></td>
                            </tr>
                        <% }); %>
                    </tbody>
                </table>
                <div class="d-flex justify-content-center    align-items-center">
                    <nav aria-label="Page navigation" class="d-flex justify-content-between align-items-center mb-4">
                    
                        <ul class="pagination mb-0">
                            <% if (typeof hasPrevPage !== 'undefined' && hasPrevPage) { %>
                                <li class="page-item">
                                    <a class="page-link" href="?page=<%= page - 1 %>&filter=<%= filter %>&startDate=<%= startDate %>&endDate=<%= endDate %>" aria-label="Previous">
                                        <span aria-hidden="true">&laquo;</span>
                                    </a>
                                </li>
                            <% } %>
                            
                            <% 
                            const currentPage = typeof page !== 'undefined' ? page : 1;
                            const totalPagesCount = typeof totalPages !== 'undefined' ? totalPages : 1;
                            let startPage = Math.max(1, currentPage - 2);
                            let endPage = Math.min(totalPagesCount, startPage + 4);
                            if (endPage - startPage < 4) {
                                startPage = Math.max(1, endPage - 4);
                            }
                            %>
                            
                            <% for(let i = startPage; i <= endPage; i++) { %>
                                <li class="page-item <%= currentPage === i ? 'active' : '' %>">
                                    <a class="page-link" href="?page=<%= i %>&filter=<%= filter %>&startDate=<%= startDate %>&endDate=<%= endDate %>"><%= i %></a>
                                </li>
                            <% } %>
                            
                            <% if (typeof hasNextPage !== 'undefined' && hasNextPage) { %>
                                <li class="page-item">
                                    <a class="page-link" href="?page=<%= currentPage + 1 %>&filter=<%= filter %>&startDate=<%= startDate %>&endDate=<%= endDate %>" aria-label="Next">
                                        <span aria-hidden="true">&raquo;</span>
                                    </a>
                                </li>
                            <% } %>
                        </ul>
                    </nav>
                </div>
                

                <script>
                    function applyFilter(filter) {
                        const url = new URL(window.location.href);
                        url.searchParams.set('filter', filter);
                        if (filter !== 'custom') {
                            url.searchParams.delete('startDate');
                            url.searchParams.delete('endDate');
                        }
                        window.location.href = url.toString();
                    }
                
                    function applyCustomFilter() {
                        const filter = 'custom';
                        const startDate = document.getElementById('start-date').value;
                        const endDate = document.getElementById('end-date').value;
                        const url = new URL(window.location.href);
                        url.searchParams.set('filter', filter);
                        if (startDate) url.searchParams.set('startDate', startDate);
                        if (endDate) url.searchParams.set('endDate', endDate);
                        window.location.href = url.toString();
                    }
                
                    document.addEventListener('DOMContentLoaded', function () {
                        const salesData = <%- JSON.stringify(salesData || []) %>;
                        const chartData = <%- JSON.stringify(reversedChartData || []) %>;
                
                        // Process payment methods from sales data
                        const paymentMethods = {};
                        salesData.forEach(order => {
                            const method = order.payment_method || 'unknown';
                            paymentMethods[method] = (paymentMethods[method] || 0) + 1;
                        });
                
                        const paymentMethodsData = Object.entries(paymentMethods).map(([method, count]) => ({
                            _id: method,
                            count: count
                        }));
                
                        // Sales Chart
                        const ctx = document.getElementById('salesChart').getContext('2d');
                        let currentChartType = 'bar';
                        let chart;
                
                        function createChart(type) {
                            if (chart) {
                                chart.destroy();
                            }
                            chart = new Chart(ctx, {
                                type: type,
                                data: {
                                    labels: chartData.map(d => d.date),
                                    datasets: [
                                        {
                                            label: 'Revenue (₹) and Orders',
                                            data: chartData.map(d => ({ x: d.date, y: d.revenue, orders: d.orders })),
                                            borderColor: 'rgb(75, 192, 192)',
                                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                            fill: true,
                                            tension: 0.1
                                        }
                                    ]
                                },
                                options: {
                                    responsive: true,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            title: {
                                                display: true,
                                                text: 'Revenue (₹)'
                                            }
                                        },
                                        x: {
                                            title: {
                                                display: true,
                                                text: '<%= filter === "today" ? "Time" : (filter === "this_week" ? "Day" : (filter === "this_month" ? "Day" : (filter === "this_year" ? "Month" : "Year"))) %>'
                                            }
                                        }
                                    },
                                    plugins: {
                                        tooltip: {
                                            callbacks: {
                                                label: function(context) {
                                                    const { revenue, orders } = chartData[context.dataIndex];
                                                    return `Revenue: ₹${revenue} | Products: ${orders}`;
                                                }
                                            }
                                        }
                                    }
                                }
                            });
                        }
                
                        createChart(currentChartType);
                
                        document.getElementById('toggleChart').addEventListener('click', function() {
                            currentChartType = currentChartType === 'bar' ? 'line' : 'bar';
                            createChart(currentChartType);
                        });
                
                        // Payment Methods Chart
                        const paymentCtx = document.getElementById('paymentMethodsChart').getContext('2d');
                        new Chart(paymentCtx, {
                            type: 'doughnut',
                            data: {
                                labels: paymentMethodsData.map(d => d._id.toUpperCase()),
                                datasets: [{
                                    data: paymentMethodsData.map(d => d.count),
                                    backgroundColor: [
                                        'rgba(255, 99, 132, 0.8)',
                                        'rgba(54, 162, 235, 0.8)',
                                        'rgba(255, 206, 86, 0.8)'
                                    ],
                                    borderColor: [
                                        'rgba(255, 99, 132, 1)',
                                        'rgba(54, 162, 235, 1)',
                                        'rgba(255, 206, 86, 1)'
                                    ],
                                    borderWidth: 1
                                }]
                            },
                            options: {
                                responsive: true,
                                plugins: {
                                    legend: {
                                        position: 'top',
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: function(context) {
                                                const data = paymentMethodsData[context.dataIndex];
                                                const percentage = ((data.count / paymentMethodsData.reduce((a, b) => a + b.count, 0)) * 100).toFixed(1);
                                                return `${data._id.toUpperCase()}: ${data.count} orders (${percentage}%)`;
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    });
                </script>
            </div>
        </div>
    </div>

    <%- include('partials/footer') %>

<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js"></script>
</body>
</html> */}






// 1-2-25
// export const renderDashboardPage = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = 10;
//         const skip = (page - 1) * limit;
//         const filter = req.query.filter || 'all_time';
//         const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
//         const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

//         console.log(`Filter: ${filter}, Page: ${page}, Start Date: ${startDate}, End Date: ${endDate}`);

//         // Build the match stage based on filters
//         let matchStage = { 'products.status': 'delivered' };

//         if (filter === 'today') {
//             const startOfDay = new Date();
//             startOfDay.setHours(0, 0, 0, 0);
//             const endOfDay = new Date(startOfDay);
//             endOfDay.setHours(23, 59, 59, 999);
//             matchStage.createdAt = { $gte: startOfDay, $lte: endOfDay };
//         } else if (filter === 'this_week') {
//             const startOfWeek = new Date();
//             startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
//             startOfWeek.setHours(0, 0, 0, 0);
//             const endOfWeek = new Date(startOfWeek);
//             endOfWeek.setDate(startOfWeek.getDate() + 6);
//             endOfWeek.setHours(23, 59, 59, 999);
//             matchStage.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
//         } else if (filter === 'this_month') {
//             const startOfMonth = new Date();
//             startOfMonth.setDate(1);
//             startOfMonth.setHours(0, 0, 0, 0);
//             const endOfMonth = new Date(startOfMonth);
//             endOfMonth.setMonth(startOfMonth.getMonth() + 1);
//             endOfMonth.setDate(0); // last day of previous month
//             endOfMonth.setHours(23, 59, 59, 999);
//             matchStage.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
//         } else if (filter === 'this_year') {
//             const startOfYear = new Date();
//             startOfYear.setMonth(0, 1);
//             startOfYear.setHours(0, 0, 0, 0);
//             const endOfYear = new Date(startOfYear);
//             endOfYear.setFullYear(startOfYear.getFullYear() + 1);
//             endOfYear.setDate(0); // last day of previous year
//             endOfYear.setHours(23, 59, 59, 999);
//             matchStage.createdAt = { $gte: startOfYear, $lte: endOfYear };
//         } else if (filter === 'custom') {
//             if (startDate) matchStage.createdAt = { $gte: startDate };
//             if (endDate) {
//                 matchStage.createdAt = matchStage.createdAt || {};
//                 matchStage.createdAt.$lte = endDate;
//             }
//         } else if (filter === 'all_time') {
//             // No additional match stage needed for all_time
//         }

//         // Ensure no data before 2024, unless custom filter is used
//         const year2024 = new Date('2024-01-01T00:00:00Z');
//         if (filter !== 'custom') {
//             matchStage.createdAt = matchStage.createdAt || {};
//             matchStage.createdAt.$gte = matchStage.createdAt.$gte || year2024;
//         }

//         console.log('Match Stage:', JSON.stringify(matchStage, null, 2));

//         // Get the total count of delivered orders
//         const totalOrders = await Order.countDocuments(matchStage);
//         console.log('Total Orders:', totalOrders);

//         const pipeline = [
//             { $unwind: '$products' },
//             { $match: matchStage },
//             {
//                 $lookup: {
//                     from: 'users',
//                     localField: 'user_id',
//                     foreignField: '_id',
//                     as: 'user'
//                 }
//             },
//             { $unwind: '$user' },
//             {
//                 $lookup: {
//                     from: 'products',
//                     localField: 'products.product_id',
//                     foreignField: '_id',
//                     as: 'productDetails'
//                 }
//             },
//             { $unwind: '$productDetails' },
//             {
//                 $group: {
//                     _id: {
//                         $switch: {
//                             branches: [
//                                 {
//                                     case: { $eq: [filter, 'today'] },
//                                     then: { $dateToString: { format: "%H:%M", date: "$createdAt" } }
//                                 },
//                                 {
//                                     case: { $eq: [filter, 'this_week'] },
//                                     then: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
//                                 },
//                                 {
//                                     case: { $eq: [filter, 'this_month'] },
//                                     then: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
//                                 },
//                                 {
//                                     case: { $eq: [filter, 'this_year'] },
//                                     then: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
//                                 },
//                                 {
//                                     case: { $eq: [filter, 'all_time'] },
//                                     then: { $year: "$createdAt" }
//                                 }
//                             ],
//                             default: "$createdAt"
//                         }
//                     },
//                     user_name: { $first: '$user.name' },
//                     createdAt: { $first: '$createdAt' },
//                     total_amount: { $sum: '$products.total_amount' },
//                     discount_amount: { $sum: '$products.discount_amount' },
//                     payment_method: { $first: '$payment_method' },
//                     products: { $push: '$productDetails' }
//                 }
//             },
//             { $sort: { createdAt: -1 } },
//             { $facet: {
//                 paginatedResults: [
//                     { $skip: skip },
//                     { $limit: limit }
//                 ],
//                 totalCount: [
//                     {
//                         $count: 'count'
//                     }
//                 ]
//             }}
//         ];

//         console.log('Pipeline:', JSON.stringify(pipeline, null, 2));

//         const [results] = await Order.aggregate(pipeline);
//         const salesData = results.paginatedResults;
//         const userCount = await User.countDocuments({ role: "user" });

//         console.log('Sales Data:', salesData);
//         console.log('User Count:', userCount);

//         const totalPages = Math.ceil(totalOrders / limit);
//         const hasNextPage = page < totalPages;
//         const hasPrevPage = page > 1;

//         const chartData = salesData.map(order => {
//             const date = new Date(order.createdAt);
//             return {
//                 date: filter === 'today' ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
//                       filter === 'this_week' || filter === 'this_month' ? date.toLocaleDateString() :
//                       filter === 'this_year' ? date.toLocaleString('default', { month: 'long' }) :
//                       date.getFullYear(),
//                 orders: order.products.length,
//                 revenue: order.total_amount
//             };
//         });

//         console.log('Chart Data:', chartData);

//         return res.render("admin/dashboard", {
//             salesData,
//             userCount,
//             totalOrders,
//             page,
//             totalPages,
//             hasNextPage,
//             hasPrevPage,
//             chartData,
//             filter,
//             startDate: req.query.startDate || '',
//             endDate: req.query.endDate || ''
//         });
//     } catch (error) {
//         console.error("Error fetching sales data:", error);
//         return res.status(500).send("Internal Server Error");
//     }
// };



// <html lang="en">
// <%- include('partials/head') %>

// <body>
//     <%
//     let totalOrders = salesData.length;
//     let totalRevenue = 0;
//     let totalDiscount = 0;

//     salesData.forEach(order => {
//         totalRevenue += order.total_amount || 0;
//         totalDiscount += order.discount_amount || 0;
//     });

//     // Reverse the chartData array to make the latest data appear on the right side
//     const reversedChartData = chartData.reverse();
//     %>

//     <div class="main-content">
//         <div class="header">
//             <div class="search-bar">
//                 <form action="/search" method="GET">
//                     <input type="text" name="search" placeholder="Search">
//                 </form>
//             </div>
//             <div class="admin-profile mx-3">
//                 <a href="/admin/settings">
//                     <i class="fa-solid fa-circle-user"></i>
//                 </a>
//             </div>
//         </div>
//         <div class="breadcrumbs">breadcrumbs</div>

//         <div class="dashboard-summary-container">
//             <div class="row">
//                 <div class="col-12 pe-3 dashboard-summary">
//                     <div class="dashboard-summary1">
//                         <h3>Total Users</h3>
//                         <p><%= userCount %></p>
//                         <p1>
//                             <i class="fa-solid fa-chart-simple"></i>
//                             <p2>Active Users</p2>
//                         </p1>
//                     </div>
//                     <div class="dashboard-summary2">
//                         <h3>Total Orders</h3>
//                         <p id="total-orders"><%= totalOrders %></p>
//                         <p1>
//                             <i class="fa-solid fa-chart-simple"></i>
//                             <p2>Delivered Orders</p2>
//                         </p1>
//                     </div>
//                     <div class="dashboard-summary3">
//                         <h3>Total Revenue</h3>
//                         <p id="gross-revenue">₹ <%= totalRevenue.toFixed(2) %></p>
//                         <p2>
//                             <i class="fa-solid fa-chart-simple"></i> From Delivered Orders
//                         </p2>
//                     </div>
//                     <div class="dashboard-summary3">
//                         <h3>Total Discount</h3>
//                         <p id="total-discount">₹ <%= totalDiscount.toFixed(2) %></p>
//                         <p2>
//                             <i class="fa-solid fa-chart-simple"></i> Applied Discounts
//                         </p2>
//                     </div>
//                     <div class="dashboard-summary3">
//                         <h3>Net Revenue</h3>
//                         <p id="net-revenue">₹ <%= (totalRevenue - totalDiscount).toFixed(2) %></p>
//                         <p2>
//                             <i class="fa-solid fa-chart-simple"></i> After Discounts
//                         </p2>
//                     </div>
//                 </div>
//             </div>
        
//             <div class="row">
//                 <div class="col-8">
//                     <div class="chart-wrapper">
//                         <div class="chart-container">
//                             <div class="filter-container">
//                                 <div class="download">
//                                     <button id="download-pdf" class="download-pdf me-2">Download PDF</button>
//                                     <button id="download-excel" class="download-excel">Download Excel</button>
//                                 </div>
//                                 <select id="filter" class="filter-select" onchange="applyFilter(this.value)">
//                                     <option value="all_time" <%= filter === 'all_time' ? 'selected' : '' %>>All Time</option>
//                                     <option value="today" <%= filter === 'today' ? 'selected' : '' %>>Today</option>
//                                     <option value="this_week" <%= filter === 'this_week' ? 'selected' : '' %>>This Week</option>
//                                     <option value="this_month" <%= filter === 'this_month' ? 'selected' : '' %>>This Month</option>
//                                     <option value="this_year" <%= filter === 'this_year' ? 'selected' : '' %>>This Year</option>
//                                     <option value="custom" <%= filter === 'custom' ? 'selected' : '' %>>Custom</option>
//                                 </select>
//                                 <div id="custom-date-range" style="display: <%= filter === 'custom' ? 'inline-block' : 'none' %>;">
//                                     <input type="date" id="start-date" class="date-input" value="<%= startDate %>">
//                                     <input type="date" id="end-date" class="date-input" value="<%= endDate %>">
//                                     <button id="apply-custom-filter" onclick="applyCustomFilter()" class="apply-btn">Apply</button>
//                                 </div>
//                                 <button id="toggleChart" class="toggle-btn"><i class="fas fa-chart-bar"></i></button>
//                             </div>
//                             <canvas id="salesChart"></canvas>
//                         </div>
//                     </div>
//                 </div>
//                 <div class="col-4">
//                     <div class="chart-wrapper">
//                         <div class="chart-container">
//                             <h6>Payment Methods Distribution</h6>
//                             <canvas id="paymentMethodsChart"></canvas>
//                         </div>
//                     </div>
//                 </div>
//             </div>
        
//             <div class="table-container">
//                 <h2>Sales Data (Delivered Orders)</h2>
//                 <table class="all-table">
//                     <thead>
//                         <tr>
//                             <th>Order ID</th>
//                             <th>Customer</th>
//                             <th>Product</th>
//                             <th>Quantity</th>
//                             <th>Amount</th>
//                             <th>Discount</th>
//                             <th>Date</th>
//                         </tr>
//                     </thead>
//                     <tbody id="sales-table-body">
//                         <% salesData.forEach(order => { %>
//                             <% order.products.forEach(product => { %>
//                                 <tr>
//                                     <td><%= order._id %></td>
//                                     <td><%= order.user_name %></td>
//                                     <td><%= product.title %></td>
//                                     <td><%= product.quantity || 0 %></td>
//                                     <td>₹ <%= (product.total_amount || 0) %></td>
//                                     <td>₹ <%= (product.discount_amount || 0) %></td>
//                                     <td><%= new Date(order.createdAt).toLocaleString() %></td>
//                                 </tr>
//                             <% }); %>
//                         <% }); %>
//                     </tbody>
//                 </table>
                
//                 <nav aria-label="Page navigation" class="d-flex justify-content-between align-items-center mb-4">
//                     <div class="page-info">
//                         Showing page <%= typeof page !== 'undefined' ? page : 1 %> of <%= typeof totalPages !== 'undefined' ? totalPages : 1 %> 
//                         (<%= typeof totalOrders !== 'undefined' ? totalOrders : salesData.length %> total orders)
//                     </div>
//                     <ul class="pagination mb-0">
//                         <% if (typeof hasPrevPage !== 'undefined' && hasPrevPage) { %>
//                             <li class="page-item">
//                                 <a class="page-link" href="?page=<%= page - 1 %>&filter=<%= filter %>" aria-label="Previous">
//                                     <span aria-hidden="true">&laquo;</span>
//                                 </a>
//                             </li>
//                         <% } %>
                        
//                         <% 
//                         const currentPage = typeof page !== 'undefined' ? page : 1;
//                         const totalPagesCount = typeof totalPages !== 'undefined' ? totalPages : 1;
//                         let startPage = Math.max(1, currentPage - 2);
//                         let endPage = Math.min(totalPagesCount, startPage + 4);
//                         if (endPage - startPage < 4) {
//                             startPage = Math.max(1, endPage - 4);
//                         }
//                         %>
                        
//                         <% for(let i = startPage; i <= endPage; i++) { %>
//                             <li class="page-item <%= currentPage === i ? 'active' : '' %>">
//                                 <a class="page-link" href="?page=<%= i %>&filter=<%= filter %>"><%= i %></a>
//                             </li>
//                         <% } %>
                        
//                         <% if (typeof hasNextPage !== 'undefined' && hasNextPage) { %>
//                             <li class="page-item">
//                                 <a class="page-link" href="?page=<%= currentPage + 1 %>&filter=<%= filter %>" aria-label="Next">
//                                     <span aria-hidden="true">&raquo;</span>
//                                 </a>
//                             </li>
//                         <% } %>
//                     </ul>
//                 </nav>

//                 <script>
//                     function applyFilter(filter) {
//                         const url = new URL(window.location.href);
//                         url.searchParams.set('filter', filter);
//                         if (filter !== 'custom') {
//                             url.searchParams.delete('startDate');
//                             url.searchParams.delete('endDate');
//                         }
//                         window.location.href = url.toString();
//                     }
                
//                     function applyCustomFilter() {
//                         const filter = 'custom';
//                         const startDate = document.getElementById('start-date').value;
//                         const endDate = document.getElementById('end-date').value;
//                         const url = new URL(window.location.href);
//                         url.searchParams.set('filter', filter);
//                         if (startDate) url.searchParams.set('startDate', startDate);
//                         if (endDate) url.searchParams.set('endDate', endDate);
//                         window.location.href = url.toString();
//                     }
                
//                     document.addEventListener('DOMContentLoaded', function () {
//                         const salesData = <%- JSON.stringify(salesData || []) %>;
//                         const chartData = <%- JSON.stringify(reversedChartData || []) %>;
                
//                         // Process payment methods from sales data
//                         const paymentMethods = {};
//                         salesData.forEach(order => {
//                             const method = order.payment_method || 'unknown';
//                             paymentMethods[method] = (paymentMethods[method] || 0) + 1;
//                         });
                
//                         const paymentMethodsData = Object.entries(paymentMethods).map(([method, count]) => ({
//                             _id: method,
//                             count: count
//                         }));
                
//                         // Sales Chart
//                         const ctx = document.getElementById('salesChart').getContext('2d');
//                         let currentChartType = 'bar';
//                         let chart;
                
//                         function createChart(type) {
//                             if (chart) {
//                                 chart.destroy();
//                             }
//                             chart = new Chart(ctx, {
//                                 type: type,
//                                 data: {
//                                     labels: chartData.map(d => d.date),
//                                     datasets: [
//                                         {
//                                             label: 'Revenue (₹) and Orders',
//                                             data: chartData.map(d => ({ x: d.date, y: d.revenue, orders: d.orders })),
//                                             borderColor: 'rgb(75, 192, 192)',
//                                             backgroundColor: 'rgba(75, 192, 192, 0.2)',
//                                             fill: true,
//                                             tension: 0.1
//                                         }
//                                     ]
//                                 },
//                                 options: {
//                                     responsive: true,
//                                     scales: {
//                                         y: {
//                                             beginAtZero: true,
//                                             title: {
//                                                 display: true,
//                                                 text: 'Revenue (₹)'
//                                             }
//                                         },
//                                         x: {
//                                             title: {
//                                                 display: true,
//                                                 text: '<%= filter === "today" ? "Time" : (filter === "this_week" ? "Day" : (filter === "this_month" ? "Day" : (filter === "this_year" ? "Month" : "Year"))) %>'
//                                             }
//                                         }
//                                     },
//                                     plugins: {
//                                         tooltip: {
//                                             callbacks: {
//                                                 label: function(context) {
//                                                     const { revenue, orders } = chartData[context.dataIndex];
//                                                     return `Revenue: ₹${revenue} | Products: ${orders}`;
//                                                 }
//                                             }
//                                         }
//                                     }
//                                 }
//                             });
//                         }
                
//                         createChart(currentChartType);
                
//                         document.getElementById('toggleChart').addEventListener('click', function() {
//                             currentChartType = currentChartType === 'bar' ? 'line' : 'bar';
//                             createChart(currentChartType);
//                         });
                
//                         // Payment Methods Chart
//                         const paymentCtx = document.getElementById('paymentMethodsChart').getContext('2d');
//                         new Chart(paymentCtx, {
//                             type: 'doughnut',
//                             data: {
//                                 labels: paymentMethodsData.map(d => d._id.toUpperCase()),
//                                 datasets: [{
//                                     data: paymentMethodsData.map(d => d.count),
//                                     backgroundColor: [
//                                         'rgba(255, 99, 132, 0.8)',
//                                         'rgba(54, 162, 235, 0.8)',
//                                         'rgba(255, 206, 86, 0.8)'
//                                     ],
//                                     borderColor: [
//                                         'rgba(255, 99, 132, 1)',
//                                         'rgba(54, 162, 235, 1)',
//                                         'rgba(255, 206, 86, 1)'
//                                     ],
//                                     borderWidth: 1
//                                 }]
//                             },
//                             options: {
//                                 responsive: true,
//                                 plugins: {
//                                     legend: {
//                                         position: 'top',
//                                     },
//                                     tooltip: {
//                                         callbacks: {
//                                             label: function(context) {
//                                                 const data = paymentMethodsData[context.dataIndex];
//                                                 const percentage = ((data.count / paymentMethodsData.reduce((a, b) => a + b.count, 0)) * 100).toFixed(1);
//                                                 return `${data._id.toUpperCase()}: ${data.count} orders (${percentage}%)`;
//                                             }
//                                         }
//                                     }
//                                 }
//                             }
//                         });
//                     });
//                 </script>
//             </div>
//         </div>
//     </div>

//     <%- include('partials/footer') %>

// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js"></script>
// </body>
// </html>
























































































































































// before fake oen fully working
// export const renderDashboardPage = async (req, res) => {
//     try {
//         // Fetch orders with populated references
//         const salesData = await Order.find()
//             .populate('user_id', 'name')
//             .populate('products.product_id', 'title category_id sub_category brand_id')
//             .sort({ createdAt: -1 });

//         // console.log('Raw Sales Data:', JSON.stringify(salesData, null, 2));

//         // Get summary counts
//         const userCount = await User.countDocuments({ role: "user" });


//         // Process orders for the frontend
//         // const processedOrders = await Promise.all(salesData.map(async order => {
//         //     const orderObj = {
//         //         _id: order._id,
//         //         user_name: order.user_id ? order.user_id.name : 'User Not Found',
//         //         createdAt: order.createdAt,
//         //         total_amount: order.total_order_amount,
//         //         products: await Promise.all(order.products.map(async product => {
//         //             const productDetails = {
//         //                 product_name: product.product_id ? product.product_id.title : 'Product Not Found',
//         //                 quantity: product.quantity || 0,
//         //                 total_amount: product.total_amount || 0,
//         //                 status: product.status || 'pending',
//         //                 order_placed_at: product.order_placed_at ? new Date(product.order_placed_at).toLocaleString() : new Date().toLocaleString(),
//         //                 category_name: 'Category Not Found',
//         //                 sub_category: 'Subcategory Not Found',
//         //                 brand_name: product.product_id && product.product_id.brand_id ? product.product_id.brand_id.name : 'Brand Not Found',
//         //                 coupon_name: 'No Coupon'
//         //             };

//         //             // Fetch category name
//         //             if (product.product_id && product.product_id.category_id) {
//         //                 const category = await Category.findById(product.product_id.category_id);
//         //                 productDetails.category_name = category ? category.name : 'Category Not Found';
//         //             }

//         //             // Fetch subcategory name
//         //             if (product.product_id && product.product_id.sub_category) {
//         //                 const subCategory = await SubCategory.findById(product.product_id.sub_category);
//         //                 productDetails.sub_category = subCategory ? subCategory.name : 'Subcategory Not Found';
//         //             }

//         //             if (order.coupon_applied && mongoose.Types.ObjectId.isValid(order.coupon_applied)) {
//         //                 // Only query if coupon_applied is a valid ObjectId
//         //                 const coupon = await Coupon.findById(order.coupon_applied);
//         //                 productDetails.coupon_name = coupon ? coupon.code : 'No Coupon';
//         //             } else {
//         //                 // Handle cases where no coupon is applied
//         //                 productDetails.coupon_name = 'No Coupon';
//         //             }
//         //             return productDetails;
//         //         })),
//         //     };
//         //     return orderObj;
//         // }));

       
//         //   console.log('All Processed Orders:', JSON.stringify(processedOrders, null, 2));
          

//         const getProductDetails = async (productId) => {
//             if (!mongoose.Types.ObjectId.isValid(productId)) {
//                 return {
//                     product_name: 'Product Not Found',
//                     category_name: 'Category Not Found',
//                     sub_category: 'Subcategory Not Found',
//                     brand_name: 'Brand Not Found'
//                 };
//             }

//             try {
//                 const product = await Product.findById(productId);
//                 if (product) {

//                     const [category, subCategory, brand] = await Promise.all([
//                         product.categoryId ? Category.findById(product.categoryId) : Promise.resolve(null),
//                         product.subcategoryId ? SubCategory.findById(product.subcategoryId) : Promise.resolve(null),
//                         product.brandId ? Brand.findById(product.brandId) : Promise.resolve(null)
//                     ]);

//                     return {
//                         product_name: product.title,
//                         category_name: category ? category.name : 'Category Not Found',
//                         sub_category: subCategory ? subCategory.name : 'Subcategory Not Found',
//                         brand_name: brand ? brand.brandName : 'Brand Not Found'
//                     };
//                 } else {
//                     return {
//                         product_name: 'Product Not Found',
//                         category_name: 'Category Not Found',
//                         sub_category: 'Subcategory Not Found',
//                         brand_name: 'Brand Not Found'
//                     };
//                 }
//             } catch (error) {
//                 return {
//                     product_name: 'Product Not Found',
//                     category_name: 'Category Not Found',
//                     sub_category: 'Subcategory Not Found',
//                     brand_name: 'Brand Not Found'
//                 };
//             }
//         };

//         const getCouponName = async (couponId) => {
//             if (!mongoose.Types.ObjectId.isValid(couponId)) {
//                 return 'No Coupon';
//             }
//             try {
//                 const coupon = await Coupon.findById(couponId);
//                 if (coupon) {
//                     return coupon.code;
//                 } else {
//                     return 'No Coupon';
//                 }
//             } catch (error) {
//                 return 'No Coupon';
//             }
//         };

//         const processedOrders = await Promise.all(salesData.map(async order => {
//             const products = await Promise.all(order.products.map(async product => {
                
//                 const productDetails = await getProductDetails(product.product_id);

//                 const couponName = await getCouponName(order.coupon_applied);

//                 return {
//                     ...productDetails,
//                     quantity: product.quantity || 0,
//                     total_amount: product.total_amount || 0,
//                     status: product.status || 'pending',
//                     order_placed_at: product.order_placed_at ? new Date(product.order_placed_at).toLocaleString() : new Date().toLocaleString(),
//                     coupon_name: couponName
//                 };
//             }));

//             return {
//                 _id: order._id,
//                 user_name: order.user_id ? order.user_id.name : 'User Not Found',
//                 createdAt: order.createdAt,
//                 total_amount: order.total_order_amount,
//                 products
//             };
//         }));


//         return res.render("admin/dashboard", {
//             salesData: processedOrders,
//             userCount,
//         });
//     } catch (error) {
//         console.error("Error fetching sales data:", error);
//         return res.status(500).send("Internal Server Error");
//     }
// };

// <!DOCTYPE html>
// <html lang="en">
// <%- include('partials/head') %>
// <body>
//     <div class="main-content">
//         <div class="header">
//             <div class="search-bar">
//                 <form action="/search" method="GET">
//                     <input type="text" name="search" placeholder="Search">
//                 </form>
//             </div>
//             <div class="admin-profile mx-3">
//                 <a href="/admin/settings">
//                     <i class="fa-solid fa-circle-user"></i>
//                 </a>
//             </div>
//         </div>
//         <div class="breadcrumbs">breadcrumbs</div>

//         <div class="dashboard-summary-container">
//             <div class="row">
//                 <!-- Top Row: Dashboard Summary Boxes -->
//                 <div class="col-12 pe-3 dashboard-summary">
//                     <div class="dashboard-summary1">
//                         <h3>Total Users</h3>
//                         <p><%= userCount %></p>
//                         <p1>
//                             <i class="fa-solid fa-chart-simple"></i> 8.5%
//                             <p2>Up from last month</p2>
//                         </p1>
//                     </div>
//                     <div class="dashboard-summary2">
//                         <h3>Total Orders</h3>
//                         <p id="total-orders">0</p>
//                         <p1>
//                             <i class="fa-solid fa-chart-simple"></i> 1.5%
//                             <p2>Up from last month</p2>
//                         </p1>
//                     </div>
//                     <div class="dashboard-summary3">
//                         <h3>Gross Revenue</h3>
//                         <p id="gross-revenue">₹ 0</p>
//                         <p2>
//                             <i class="fa-solid fa-chart-simple"></i> 4.5% Down from last month
//                         </p2>
//                     </div>
//                     <div class="dashboard-summary3">
//                         <h3>Returns/Refunds</h3>
//                         <p id="returns-refunds">₹ 0</p>
//                         <p2>
//                             <i class="fa-solid fa-chart-simple"></i> 4.5% Down from last month
//                         </p2>
//                     </div>
//                     <div class="dashboard-summary3">
//                         <h3>Net Revenue</h3>
//                         <p id="net-revenue">₹ 0</p>
//                         <p2>
//                             <i class="fa-solid fa-chart-simple"></i> 4.5% Down from last month
//                         </p2>
//                     </div>
//                 </div>
//             </div>
        
//             <div class="row">
//                 <!-- Main Content Row -->
//                 <div class="col-9">
//                     <!-- Chart Section -->
//                     <div class="chart-wrapper">
//                         <div class="chart-container">
//                             <div class="filter-container">
//                                 <div class="dawonload">
//                                     <button id="download-pdf" class="download-pdf me-2">DownloadPDF</button>
//                                     <button id="download-excel" class="download-excel">DownloadExcel</button>
//                                 </div>
//                                 <select id="filter" class="filter-select">
//                                     <option value="all_time">All Time</option>
//                                     <option value="today">Today</option>
//                                     <option value="this_week">This Week</option>
//                                     <option value="this_month">This Month</option>
//                                     <option value="this_year">This Year</option>
//                                     <option value="custom">Custom</option>
//                                 </select>
//                                 <div id="custom-date-range" style="display: none;">
//                                     <input type="date" id="start-date" class="date-input">
//                                     <input type="date" id="end-date" class="date-input">
//                                     <button id="apply-custom-filter" class="apply-btn">Apply</button>
//                                 </div>
//                                 <button id="toggleChart" class="toggle-btn"><i class="fas fa-chart-bar"></i></button>
//                             </div>
//                             <canvas id="salesChart"></canvas>
//                         </div>
//                     </div>
//                 </div>
        
//                 <!-- Vertical Box Section -->
//                 <!-- <div class="col-3">
//                     <div class="vertical-box">
                        
//                     </div>
//                 </div> -->
//             </div>
//         </div>
        
//         <!-- Filter Section -->
        

//         <!-- Table Section -->
//         <div class="table-container" style="margin-top: 20px;">
//             <h2>Sales Data</h2>
            
//             <table class="all-table">
//                 <thead>
//                     <tr>
//                         <th>No</th>
//                         <th>Order ID</th>
//                         <th>Customer</th>
//                         <th>Product</th>
//                         <th>Quantity</th>
//                         <th>Amount</th>
//                         <th>Status</th>
//                         <th>Date</th>
//                     </tr>
//                 </thead>
//                 <tbody id="salesDataTableBody">
//                 </tbody>
//             </table>
//             <div class="pagination mb-4">
//                 <div id="pageInfo" class="page-info"></div>
//                 <div id="paginationControls" class="pagination-controls"></div>
//             </div>
//         </div>

//     </div>

//     <%- include('partials/footer') %>

// <style>
// .pagination {
//     display: flex;
//     flex-direction: column;
//     align-items: center;
//     justify-content: center;
//     margin-top: 20px;
//     font-size: var(--font-size-third);
//     gap: 10px;
// }

// .page-info {
//     color: var(--text-color-3);
//     margin-bottom: 10px;
// }

// .pagination-controls {
//     display: flex;
//     justify-content: center;
//     flex-wrap: wrap;
//     gap: 5px;
// }

// .pagination-controls button {
//     padding: 1px 6px;
//     margin: 0 5px;
//     border: 1px solid var(--bg-color-btn-hover2);
//     color: var(--text-color-3);
//     cursor: pointer;
//     background: transparent;
//     transition: all 0.3s ease;
//     font-size: inherit;
// }

// .pagination-controls button:hover {
//     color: var(--text-color);
//     border: 1px solid var(--text-color);
//     background-color: var(--text-color-2);
// }

// .pagination-controls button.active {
//     color: var(--text-color-4);
//     border: 1px solid var(--text-color-4);
//     background-color: var(--bg-color-btn-hover-4);
// }

// .pagination-controls button:disabled {
//     opacity: 0.5;
//     cursor: not-allowed;
// }


// </style>
// <!-- Load jsPDF first -->
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

// <!-- Then load the AutoTable plugin -->
// <script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.5.22/dist/jspdf.plugin.autotable.min.js"></script>

// <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js"></script>

// <script>
// document.addEventListener('DOMContentLoaded', function () {
//     const salesData = <%- JSON.stringify(salesData) %>;

//     console.log(salesData)



//     const ctx = document.getElementById('salesChart').getContext('2d');
//     const chartContainer = document.querySelector('.chart-container');

//     let currentChartType = 'bar';
//     let chart = null;

//     // Initialize filter elements
//     const filterSelect = document.getElementById('filter');
//     const customDateRange = document.getElementById('custom-date-range');
//     const startDateInput = document.getElementById('start-date');
//     const endDateInput = document.getElementById('end-date');
//     const applyCustomFilterButton = document.getElementById('apply-custom-filter');

//     // Pagination variables
//     let currentPage = 1;
//     const rowsPerPage = 10;

//     let currentFilteredData = []; 

//     function processDataForDisplay() {
//         let filteredProducts = [];
//         salesData.forEach(order => {
//             if (order.products && Array.isArray(order.products)) {
//                 order.products.forEach(product => {
//                     filteredProducts.push({
//                         orderId: order._id,
//                         userName: order.user_name,
//                         productName: product.product_name,
//                         productBrandName: product.brand_name,
//                         productCategoryName: product.category_name,
//                         productSubCategoryName: product.sub_category,
//                         productCouponCode: product.coupon_name,
//                         quantity: product.quantity,
//                         amount: product.total_amount,
//                         status: product.status,
//                         date: new Date(order.createdAt)
                        


//                     });
//                 });
//             }
//         });
//         return filteredProducts;
//     }

//     function filterByDateRange(data, startDate, endDate) {
//         if (!startDate || !endDate) return data;
//         return data.filter(item => {
//             const itemDate = item.date;
//             return itemDate >= startDate && itemDate <= endDate;
//         });
//     }

//     function updateSummaryCards(data) {
//         const filter = filterSelect.value;
//         let filteredData = [...data];
//         const now = new Date();

//         // Filter data based on selected period
//         if (filter === 'today') {
//             filteredData = data.filter(item => {
//                 const itemDate = new Date(item.date);
//                 return itemDate.toDateString() === now.toDateString();
//             });
//         } else if (filter === 'this_week') {
//             const weekStart = new Date();
//             weekStart.setDate(weekStart.getDate() - 6); 
//             const weekEnd = new Date(); 
//             filteredData = data.filter(item => {
//                 const itemDate = new Date(item.date);
//                 return itemDate >= weekStart && itemDate <= weekEnd;
//             });
//         } else if (filter === 'this_month') {
//             const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
//             filteredData = data.filter(item => {
//                 const itemDate = new Date(item.date);
//                 return itemDate >= monthStart;
//             });
//         } else if (filter === 'this_year') {
//             const yearStart = new Date(now.getFullYear(), 0, 1);
//             filteredData = data.filter(item => {
//                 const itemDate = new Date(item.date);
//                 return itemDate >= yearStart;
//             });
//         }

//         // Calculate metrics
//         let totalOrders = 0;
//         let grossRevenue = 0;
//         let returnsRefunds = 0;


//         filteredData.forEach(item => {
//             totalOrders++;
//             grossRevenue += item.amount;
//             if (item.status === 'returned') {
//                 returnsRefunds += item.amount;
//             }
//         });

//         const netRevenue = grossRevenue - returnsRefunds;

//         document.getElementById('total-orders').textContent = totalOrders;
//         document.getElementById('gross-revenue').textContent = `₹ ${grossRevenue.toLocaleString()}`;
//         document.getElementById('returns-refunds').textContent = `₹ ${returnsRefunds.toLocaleString()}`;
//         document.getElementById('net-revenue').textContent = `₹ ${netRevenue.toLocaleString()}`;

//     }


//     function updateChart(data) {
//         const groupedData = {};
//         const filter = filterSelect.value;

//         // Update summary cards with filtered data
//         updateSummaryCards(data);

//         data.forEach(item => {
//             let key;
//             const date = new Date(item.date);
            
//             if (filter === 'today') {
//                 key = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//             } else if (filter === 'all_time') {
//                 key = date.getFullYear().toString(); 
//             } else if (filter === 'this_year') {
//                 key = date.toLocaleDateString([], { month: 'long' });
//             } else {
//                 key = date.toLocaleDateString();
//             }

//             if (!groupedData[key]) {
//                 groupedData[key] = {
//                     total: 0,
//                     delivered: 0,
//                     returned: 0,
//                     orderCount: 0,
//                     deliveredCount: 0,
//                     returnedCount: 0
//                 };
//             }
//             groupedData[key].total += item.amount;
//             groupedData[key].orderCount += 1;
            
//             if (item.status === 'delivered') {
//                 groupedData[key].delivered += item.amount;
//                 groupedData[key].deliveredCount += 1;
//             }
//             if (item.status === 'returned') {
//                 groupedData[key].returned += item.amount;
//                 groupedData[key].returnedCount += 1;
//             }
//         });

//         // Sort keys based on date
//         const dates = Object.keys(groupedData);
//         if (filter === 'today') {
//             dates.sort((a, b) => {
//                 const timeA = new Date(`1970/01/01 ${a}`);
//                 const timeB = new Date(`1970/01/01 ${b}`);
//                 return timeA - timeB;
//             });
//         } else if (filter === 'all_time') {
//             dates.sort((a, b) => a - b); 
//         } else {
//             dates.sort((a, b) => new Date(a) - new Date(b));
//         }

//         const datasets = [
//             {
//                 label: 'Total Sales',
//                 data: dates.map(date => groupedData[date].total),
//                 backgroundColor: getComputedStyle(chartContainer).getPropertyValue('--bar-color'),
//                 borderColor: getComputedStyle(chartContainer).getPropertyValue('--bar-border-color'),
//                 borderWidth: 1,
//                 orderCounts: dates.map(date => groupedData[date].orderCount)
//             },
//             {
//                 label: 'Delivered',
//                 data: dates.map(date => groupedData[date].delivered),
//                 backgroundColor: getComputedStyle(chartContainer).getPropertyValue('--delivered-bar-color'),
//                 borderColor: getComputedStyle(chartContainer).getPropertyValue('--delivered-bar-border'),
//                 borderWidth: 1,
//                 orderCounts: dates.map(date => groupedData[date].deliveredCount)
//             },
//             {
//                 label: 'Returned',
//                 data: dates.map(date => groupedData[date].returned),
//                 backgroundColor: getComputedStyle(chartContainer).getPropertyValue('--returned-bar-color'),
//                 borderColor: getComputedStyle(chartContainer).getPropertyValue('--returned-bar-border'),
//                 borderWidth: 1,
//                 orderCounts: dates.map(date => groupedData[date].returnedCount)
//             }
//         ];

//         if (chart) {
//             chart.destroy();
//         }

//         chart = new Chart(ctx, {
//             type: currentChartType,
//             data: {
//                 labels: dates,
//                 datasets: datasets
//             },
//             options: {
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 scales: {
//                     y: {
//                         beginAtZero: true,
//                         ticks: {
//                             callback: value => '₹ ' + value.toLocaleString(),
//                             color: 'rgba(255, 255, 255, 0.8)'  
//                         },
//                         grid: {
//                             color: 'rgba(255, 255, 255, 0.1)'  
//                         }
//                     },
//                     x: {
//                         ticks: {
//                             color: 'rgba(255, 255, 255, 0.8)'  
//                         },
//                         grid: {
//                             color: 'rgba(255, 255, 255, 0.1)'  
//                         }
//                     }
//                 },
//                 plugins: {
//                     legend: {
//                         labels: {
//                             color: 'rgba(255, 255, 255, 0.8)'  
//                         }
//                     },
//                     tooltip: {
//                         callbacks: {
//                             label: context => {
//                                 const count = context.dataset.orderCounts[context.dataIndex];
//                                 return [
//                                     `${context.dataset.label}: ₹ ${context.parsed.y.toLocaleString()}`,
//                                     `Orders: ${count}`
//                                 ];
//                             }
//                         }
//                     }
//                 }
//             }
//         });
//     }


    

    


//     function updateTable(data) {
//         const tbody = document.getElementById('salesDataTableBody');
//         tbody.innerHTML = '';

//         const start = (currentPage - 1) * rowsPerPage;
//         const end = Math.min(start + rowsPerPage, data.length);
//         const pageData = data.slice(start, end);
//         console.log("page",pageData)

//         pageData.forEach((item, index) => {
//             const row = document.createElement('tr');
//             const dateTimeFormat = filterSelect.value === 'today' 
//                 ? item.date.toLocaleTimeString() 
//                 : item.date.toLocaleString();    

//             row.innerHTML = `
//                 <td>${start + index + 1}</td>
//                 <td>${item.orderId}</td>
//                 <td>${item.userName}</td>
//                 <td>${item.productName}</td>
//                 <td>${item.quantity}</td>
//                 <td>₹ ${item.amount.toLocaleString()}</td>
//                 <td><span class="status ${item.status}">${item.status}</span></td>
//                 <td>${dateTimeFormat}</td>
//             `;
//             tbody.appendChild(row);
//         });
//     }

//     function updatePaginationControls(totalItems) {
//         const totalPages = Math.ceil(totalItems / rowsPerPage);
//         const controls = document.getElementById('paginationControls');
//         controls.innerHTML = '';

//         if (totalPages > 3) {
//             addPageButton('First', 1);
//         }

//         for (let i = 1; i <= totalPages; i++) {
//             if (totalPages <= 3 || 
//                 i === 1 || 
//                 i === totalPages || 
//                 (i >= currentPage - 1 && i <= currentPage + 1)) {
//                 addPageButton(i, i);
//             }
//         }

//         if (totalPages > 3) {
//             addPageButton('Last', totalPages);
//         }

//         document.getElementById('pageInfo').textContent = 
//             `Page ${currentPage} of ${totalPages}`;
//     }

//     function addPageButton(text, page) {
//         const button = document.createElement('button');
//         button.textContent = text;
//         if (page === currentPage) button.classList.add('active');
//         button.addEventListener('click', () => {
//             currentPage = page;
//             refreshDisplay();
//         });
//         document.getElementById('paginationControls').appendChild(button);
//     }

//     function getDateRange(filter) {
//         const today = new Date();
//         let startDate, endDate;

//         switch (filter) {
//             case 'all_time':
//                 // For all time, we'll get data from 5 years ago to ensure we have enough history
//                 startDate = new Date(today.getFullYear() - 5, 0, 1);
//                 startDate.setHours(0, 0, 0, 0);
//                 endDate = new Date();
//                 endDate.setHours(23, 59, 59, 999);
//                 break;
//             case 'today':
//                 startDate = new Date(today.setHours(0, 0, 0, 0));
//                 endDate = new Date();
//                 endDate.setHours(23, 59, 59, 999);
//                 break;
//             case 'this_week':
//                 // Get today and set end time to 23:59:59
//                 endDate = new Date();
//                 endDate.setHours(23, 59, 59, 999);
                
//                 // Get 7 days back from today and set start time to 00:00:00
//                 startDate = new Date();
//                 startDate.setDate(endDate.getDate() - 6); 
//                 startDate.setHours(0, 0, 0, 0);
//                 break;
//             case 'this_month':
//                 startDate = new Date(today.getFullYear(), today.getMonth(), 1);
//                 endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
//                 endDate.setHours(23, 59, 59, 999);
//                 break;
//             case 'this_year':
//                 startDate = new Date(today.getFullYear(), 0, 1);
//                 endDate = new Date(today.getFullYear(), 11, 31);
//                 endDate.setHours(23, 59, 59, 999);
//                 break;
//             case 'custom':
//                 if (!startDateInput.value || !endDateInput.value) return null;
//                 startDate = new Date(startDateInput.value);
//                 startDate.setHours(0, 0, 0, 0);
//                 endDate = new Date(endDateInput.value);
//                 endDate.setHours(23, 59, 59, 999);
//                 break;
//             default:
//                 return null;
//         }

//         console.log(`Filter: ${filter}`);
//         console.log(`Start Date: ${startDate.toLocaleString()}`);
//         console.log(`End Date: ${endDate.toLocaleString()}`);
        
//         return { startDate, endDate };
//     }








//     document.getElementById('download-excel').addEventListener('click', function() {
//     console.log('Generating Excel with current filtered data.');
//     console.log('Current Filtered Data:', currentFilteredData); // Debugging line

//     if (!currentFilteredData || currentFilteredData.length === 0) {
//         console.error('No orders available for the selected filter.');
//         alert('No orders available for the selected filter.');
//         return;
//     }

//     // Calculate overall statistics
//     const totalOrders = currentFilteredData.length;
//     const totalAmount = currentFilteredData.reduce((sum, order) => sum + order.amount, 0);
//     const discountAmount = currentFilteredData.reduce((sum, order) => sum + (order.discount || 0), 0);
//     const netRevenue = totalAmount - discountAmount;

//     // Calculate product status counts
//     const statusCounts = currentFilteredData.reduce((counts, order) => {
//         counts[order.status] = (counts[order.status] || 0) + 1;
//         return counts;
//     }, {});

//     const reportData = currentFilteredData.map(order => ({
//         'Order ID': order.orderId,
//         'User': order.userName,
//         'Product': order.productName,
//         'Status': order.status,
//         'Date': new Date(order.date).toLocaleString(), 
//         'Amount': '₹ ' + order.amount.toFixed(2),
//         'Amount After Discount': '₹ ' + (order.amount - (order.discount || 0)).toFixed(2)
//     }));


//     const overallStats = [
//         ['Total Orders', totalOrders],
//         ['Total Sales Amount', '₹ ' + totalAmount.toFixed(2)],
//         ['Net Revenue', '₹ ' + netRevenue.toFixed(2)],
//         ['Pending Orders', statusCounts.pending || 0],
//         ['Delivered Orders', statusCounts.delivered || 0],
//         ['Returned Orders', statusCounts.returned || 0]
//     ];

//     const wsOrders = XLSX.utils.json_to_sheet(reportData);

//     const wb = XLSX.utils.book_new();

//     const statsSheet = XLSX.utils.aoa_to_sheet(overallStats);
//     XLSX.utils.book_append_sheet(wb, statsSheet, 'Overall Stats');

//     XLSX.utils.book_append_sheet(wb, wsOrders, 'Sales Report');

//     XLSX.writeFile(wb, 'sales_report.xlsx');
// });




// document.getElementById('download-pdf').addEventListener('click', function () {
//     console.log('Generating PDF with current filtered data.');
//     console.log('Current Filtered Data:', currentFilteredData);

//     if (currentFilteredData.length === 0) {
//         console.error('No orders available for the selected filter.');
//         return;
//     }

//     const totalOrders = currentFilteredData.length;
//     const totalAmount = currentFilteredData.reduce((sum, order) => sum + order.amount, 0);
//     const discountAmount = currentFilteredData.reduce((sum, order) => sum + (order.discount || 0), 0);
//     const netRevenue = totalAmount - discountAmount;

//     const statusCounts = {
//         pending: 0,
//         processing: 0,
//         shipped: 0,
//         delivered: 0,
//         canceled: 0,
//         return_req: 0,
//         returned: 0,
//     };

//     currentFilteredData.forEach(order => {
//         if (order.status === 'pending') statusCounts.pending++;
//         if (order.status === 'processing') statusCounts.processing++;
//         if (order.status === 'shipped') statusCounts.shipped++;
//         if (order.status === 'delivered') statusCounts.delivered++;
//         if (order.status === 'canceled') statusCounts.canceled++;
//         if (order.status === 'return_req') statusCounts.return_req++;
//         if (order.status === 'returned') statusCounts.returned++;
//     });

//     const { jsPDF } = window.jspdf;
//     const doc = new jsPDF();

//     doc.setFont('helvetica', 'normal');

//     function formatCurrency(amount) {
//         return Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
//     }

//     doc.setFontSize(18);
//     doc.text('Sales Report', 105, 15, { align: 'center' });

//     doc.setFontSize(12);
//     doc.text('Generated on: ' + new Date().toLocaleString(), 10, 25);

//     doc.setFontSize(14);
//     doc.text('Overall Statistics', 10, 35);
//     doc.setFontSize(12);
//     doc.text('Total Orders: ' + totalOrders, 10, 45);
//     doc.text('Total Sales Amount:  ' + formatCurrency(totalAmount), 10, 55);
//     doc.text('Total Discounts:  ' + formatCurrency(discountAmount), 10, 65);
//     doc.text('Net Revenue:  ' + formatCurrency(netRevenue), 10, 75);

//     doc.setFontSize(14);
//     doc.text('Order Status Summary', 10, 85);
//     doc.setFontSize(12);
//     let currentY = 95;

//     if (statusCounts.pending > 0) {
//         doc.text('Pending: ' + statusCounts.pending, 10, currentY);
//         currentY += 10;
//     }
//     if (statusCounts.processing > 0) {
//         doc.text('Processing: ' + statusCounts.processing, 10, currentY);
//         currentY += 10;
//     }
//     if (statusCounts.shipped > 0) {
//         doc.text('Shipped: ' + statusCounts.shipped, 10, currentY);
//         currentY += 10;
//     }
//     if (statusCounts.delivered > 0) {
//         doc.text('Delivered: ' + statusCounts.delivered, 10, currentY);
//         currentY += 10;
//     }
//     if (statusCounts.canceled > 0) {
//         doc.text('Canceled: ' + statusCounts.canceled, 10, currentY);
//         currentY += 10;
//     }
//     if (statusCounts.return_req > 0) {
//         doc.text('Return Requested: ' + statusCounts.return_req, 10, currentY);
//         currentY += 10;
//     }
//     if (statusCounts.returned > 0) {
//         doc.text('Returned: ' + statusCounts.returned, 10, currentY);
//         currentY += 10;
//     }

//     doc.text('Order Details:', 10, currentY);
//     currentY += 10;

//     doc.autoTable({
//         head: [['Sl No', 'User Name', 'Product Name', 'Quantity', 'Total Amount', 'Discounted Amount', 'Status', 'Order Date']],
//         body: currentFilteredData.map((order, index) => [
//             index + 1,
//             order.userName,
//             order.productName,
//             order.quantity,
//             formatCurrency(order.amount),
//             formatCurrency((order.amount - (order.discount || 0))),
//             order.status,
//             new Date(order.date).toLocaleString(),
//         ]),
//         startY: currentY,
//         theme: 'grid',
//         margin: { top: 10, left: 10, right: 10 },
//         styles: {
//             fontSize: 10,
//             cellPadding: 3,
//             halign: 'center',
//             valign: 'middle',
//         },
//         columnStyles: {
//             0: { halign: 'center' },
//             1: { halign: 'left' },
//             2: { halign: 'left' },
//             3: { halign: 'center' },
//             4: { halign: 'right' },
//             5: { halign: 'right' },
//             6: { halign: 'center' },
//             7: { halign: 'center' },
//         },
//     });

//     doc.save('sales_report.pdf');
// });






//     function refreshDisplay() {
//         const dateRange = getDateRange(filterSelect.value);
//         let displayData = processDataForDisplay();
        
//         if (dateRange) {
//             displayData = filterByDateRange(displayData, dateRange.startDate, dateRange.endDate);
//         }

//         currentFilteredData = displayData; 

//         updateTable(displayData);
//         updateChart(displayData);
//         updatePaginationControls(displayData.length);
//     }

//     // Event Listeners
//     filterSelect.addEventListener('change', function() {
//         if (this.value === 'custom') {
//             customDateRange.style.display = 'flex';
//         } else {
//             customDateRange.style.display = 'none';
//             currentPage = 1;
//             refreshDisplay();
//         }
//     });

//     applyCustomFilterButton.addEventListener('click', () => {
//         currentPage = 1;
//         refreshDisplay();
//     });

//     document.getElementById('toggleChart').addEventListener('click', () => {
//         currentChartType = currentChartType === 'bar' ? 'line' : 'bar';
//         refreshDisplay();
//     });

//     function getCurrentFilter() {
//         return filterSelect.value;
//     }

//     // Initialize display
//     refreshDisplay();
// });
// </script>
// </body>
// </html>