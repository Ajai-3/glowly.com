import User from "../../models/user.model.js"
import Order from "../../models/order.model.js"
import Product from "../../models/product.model.js"
import Category from "../../models/category.model.js";



export const renderDashboardPage = async (req, res) => {
    try {
        // Fetch orders with populated references
        const salesData = await Order.find()
            .populate('user_id', 'name')
            .populate('products.product_id', 'title')
            .sort({ createdAt: -1 });

        console.log('Raw Sales Data:', JSON.stringify(salesData, null, 2));

        // Get summary counts
        const userCount = await User.countDocuments({ role: "user" });
        const orderCount = await Order.countDocuments();
        const totalAmount = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$total_order_amount" }
                }
            }
        ]);

        const total = totalAmount.length > 0 ? totalAmount[0].totalAmount : 0;
        const formattedTotal = `₹ ${total.toLocaleString()}`;

        // Process orders for the frontend
        const processedOrders = salesData.map(order => {
            const orderObj = {
                _id: order._id,
                user_name: order.user_id ? order.user_id.name : 'User Not Found',
                createdAt: order.createdAt,
                total_amount: order.total_order_amount,
                products: []
            };

            if (order.products && Array.isArray(order.products)) {
                orderObj.products = order.products.map(product => ({
                    product_name: product.product_id ? product.product_id.title : 'Product Not Found',
                    quantity: product.quantity || 0,
                    total_amount: product.total_amount || 0,
                    status: product.status || 'pending',
                    order_placed_at: product.order_placed_at ? new Date(product.order_placed_at).toLocaleString() : new Date().toLocaleString()
                }));
            }

            return orderObj;
        });

        // console.log('Processed Orders:', JSON.stringify(processedOrders, null, 2));

        return res.render("admin/dashboard", {
            salesData: processedOrders,
            userCount,
            orderCount,
            totalAmount: formattedTotal
        });
    } catch (error) {
        console.error("Error fetching sales data:", error);
        return res.status(500).send("Internal Server Error");
    }
};

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
//                         <p><%= orderCount %></p>
//                         <p1>
//                             <i class="fa-solid fa-chart-simple"></i> 1.5%
//                             <p2>Up from last month</p2>
//                         </p1>
//                     </div>
//                     <div class="dashboard-summary3">
//                         <h3>Gross Revenue</h3>
//                         <p><%= totalAmount %></p>
//                         <p2>
//                             <i class="fa-solid fa-chart-simple"></i> 4.5% Down from last month
//                         </p2>
//                     </div>
//                     <div class="dashboard-summary3">
//                         <h3>Returns/Refunds</h3>
//                         <p><%= totalAmount %></p>
//                         <p2>
//                             <i class="fa-solid fa-chart-simple"></i> 4.5% Down from last month
//                         </p2>
//                     </div>
//                     <div class="dashboard-summary3">
//                         <h3>Net Revenue</h3>
//                         <p><%= totalAmount %></p>
//                         <p2>
//                             <i class="fa-solid fa-chart-simple"></i> 4.5% Down from last month
//                         </p2>
//                     </div>
//                 </div>
//             </div>
        
//             <div class="row">
//                 <!-- Main Content Row -->
//                 <div class="col-9 pe-3">
//                     <!-- Chart Section -->
//                     <div class="chart-wrapper">
//                         <div class="chart-container">
//                             <div class="filter-container">
//                                 <label for="filter">Filter Sales Data:</label>
//                                 <select id="filter" name="filter">
//                                     <option value="all_time" selected>All Time</option>
//                                     <option value="today">Today</option>
//                                     <option value="this_week">This Week</option>
//                                     <option value="this_month">This Month</option>
//                                     <option value="custom">Custom</option>
//                                 </select>
//                                 <div id="custom-date-range" style="display: none;">
//                                     <label for="start-date">Start Date:</label>
//                                     <input type="date" id="start-date" name="start-date">
//                                     <label for="end-date">End Date:</label>
//                                     <input type="date" id="end-date" name="end-date">
//                                     <button id="apply-custom-filter">Apply</button>
//                                 </div>
//                             </div>
//                             <button id="toggleChart" class="toggle-button">
//                                 <i class="fas fa-chart-bar"></i>
//                             </button>
//                             <canvas id="salesChart"></canvas>
//                         </div>
//                     </div>
//                 </div>
        
//                 <!-- Vertical Box Section -->
//                 <div class="col-3">
//                     <div class="vertical-box">
//                         xcvxcvxcv
//                     </div>
//                 </div>
//             </div>
//         </div>
        
//         <!-- Filter Section -->
        

//         <!-- Table Section -->
//         <div class="table-container" style="margin-top: 20px;">
//             <h2>Sales Data</h2>
//             <table class="all-table">
//                 <thead>
//                     <tr>
//                         <th>Sl No.</th>
//                         <th>User Name</th>
//                         <th>Product Name</th>
//                         <th>Quantity</th>
//                         <th>Total Amount</th>
//                         <th>Status</th>
//                         <th>Order Placed At</th>
//                     </tr>
//                 </thead>
//                 <tbody id="salesDataTableBody">
//                 </tbody>
//             </table>
//             <!-- Pagination Controls -->
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

// <script>
//    document.addEventListener('DOMContentLoaded', function () {
//         const salesData = <%- JSON.stringify(salesData) %>;
//         console.log("Sales Data:", salesData);

//         if (salesData.length === 0) {
//             console.warn("No sales data available to render the chart.");
//             return;
//         }

//         const ctx = document.getElementById('salesChart').getContext('2d');
//         const chartContainer = document.querySelector('.chart-container');

//         let currentChartType = 'bar';
//         let chart = createChart(salesData);

//         document.getElementById('toggleChart').addEventListener('click', () => {
//             currentChartType = currentChartType === 'bar' ? 'line' : 'bar';
//             chart.destroy();
//             chart = createChart(salesData, currentChartType);
//         });

//         const filterSelect = document.getElementById('filter');
//         const customDateRange = document.getElementById('custom-date-range');
//         const startDateInput = document.getElementById('start-date');
//         const endDateInput = document.getElementById('end-date');
//         const applyCustomFilterButton = document.getElementById('apply-custom-filter');

//         // Pagination variables
//         let currentPage = 1;
//         const rowsPerPage = 10;

//         let productList = [];

//         // Initialize with the default filter
//         filterSalesData('all_time');

//         filterSelect.addEventListener('change', function () {
//             if (this.value === 'custom') {
//                 customDateRange.style.display = 'block';
//             } else {
//                 customDateRange.style.display = 'none';
//                 filterSalesData(this.value);
//             }
//         });

//         applyCustomFilterButton.addEventListener('click', function () {
//             filterSalesData('custom');
//         });

//         function updateSalesTable() {
//             const tbody = document.querySelector('#salesDataTableBody');
//             tbody.innerHTML = '';

//             const start = (currentPage - 1) * rowsPerPage;
//             const end = start + rowsPerPage;
//             const paginatedData = productList.slice(start, end);

//             let serialNumber = start + 1;
//             paginatedData.forEach(item => {
//                 const { order, product } = item;
//                 const row = `
//                     <tr>
//                         <td>${serialNumber++}</td>
//                         <td>${order.user_name}</td>
//                         <td>${product.product_name}</td>
//                         <td>${product.quantity}</td>
//                         <td>₹ ${product.total_amount.toLocaleString()}</td>
//                         <td>${product.status}</td>
//                         <td>${product.order_placed_at}</td>
//                     </tr>
//                 `;
//                 tbody.insertAdjacentHTML('beforeend', row);
//             });
//         }

//         function updatePaginationControls() {
//             const paginationControls = document.getElementById('paginationControls');
//             paginationControls.innerHTML = '';
            
//             const totalPages = Math.ceil(productList.length / rowsPerPage);
            
//             // Add First button
//             if (totalPages > 3) {
//                 const firstButton = document.createElement('button');
//                 firstButton.textContent = 'First';
//                 firstButton.addEventListener('click', () => {
//                     currentPage = 1;
//                     updateSalesTable();
//                     updatePaginationControls();
//                 });
//                 if (currentPage === 1) firstButton.disabled = true;
//                 paginationControls.appendChild(firstButton);
//             }

//             // Calculate the range of page numbers to show
//             let startPage = currentPage - 1;
//             let endPage = currentPage + 1;

//             // Adjust if at the start
//             if (startPage < 1) {
//                 startPage = 1;
//                 endPage = Math.min(3, totalPages);
//             }

//             // Adjust if at the end
//             if (endPage > totalPages) {
//                 endPage = totalPages;
//                 startPage = Math.max(1, totalPages - 2);
//             }

//             // Add page number buttons
//             for (let i = startPage; i <= endPage; i++) {
//                 const pageButton = document.createElement('button');
//                 pageButton.textContent = i;
//                 if (i === currentPage) {
//                     pageButton.classList.add('active');
//                 }
//                 pageButton.addEventListener('click', () => {
//                     currentPage = i;
//                     updateSalesTable();
//                     updatePaginationControls();
//                 });
//                 paginationControls.appendChild(pageButton);
//             }

//             // Add Last button
//             if (totalPages > 3) {
//                 const lastButton = document.createElement('button');
//                 lastButton.textContent = 'Last';
//                 lastButton.addEventListener('click', () => {
//                     currentPage = totalPages;
//                     updateSalesTable();
//                     updatePaginationControls();
//                 });
//                 if (currentPage === totalPages) lastButton.disabled = true;
//                 paginationControls.appendChild(lastButton);
//             }

//             // Update page info
//             document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
//         }

//         function getDateRange(filter) {
//             const today = new Date();
//             let startDate, endDate;

//             switch (filter) {
//                 case 'today':
//                     startDate = new Date(today.setHours(0, 0, 0, 0));
//                     endDate = new Date();  // Current date and time
//                     break;
//                 case 'this_week':
//                     const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
//                     startDate = new Date(firstDayOfWeek.setHours(0, 0, 0, 0));
//                     endDate = new Date(firstDayOfWeek.setDate(firstDayOfWeek.getDate() + 6)).setHours(23, 59, 59, 999);
//                     break;
//                 case 'this_month':
//                     startDate = new Date(today.getFullYear(), today.getMonth(), 1);
//                     endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
//                     break;
//                 case 'custom':
//                     startDate = new Date(startDateInput.value);
//                     endDate = new Date(endDateInput.value);
//                     break;
//                 case 'all_time':
//                 default:
//                     startDate = new Date(0); // Epoch time
//                     endDate = new Date();    // Current date and time
//                     break;
//             }

//             return { startDate, endDate };
//         }

//         function filterSalesData(filter) {
//             const { startDate, endDate } = getDateRange(filter);
//             const filteredSalesData = salesData.filter(order => {
//                 const orderDate = new Date(order.createdAt);
//                 return orderDate >= startDate && orderDate <= endDate;
//             });

//             productList = [];
//             filteredSalesData.forEach(order => {
//                 order.products.forEach(product => {
//                     productList.push({
//                         order,
//                         product
//                     });
//                 });
//             });

//             console.log("Filtered Product List:", productList);

//             chart.destroy();
//             chart = createChart(filteredSalesData, currentChartType);
//             currentPage = 1; // Reset to first page whenever filter changes
//             updateSalesTable();
//             updatePaginationControls();
//         }

//         function createChart(data, type = 'bar') {
//             const labels = data.map(order => new Date(order.createdAt).toLocaleDateString());
//             const totalSales = data.map(order => order.total_amount);

//             const deliveredData = data.filter(order => 
//                 order.products.some(product => product.status === "delivered")
//             ).map(order => order.products.reduce((sum, product) => 
//                 product.status === "delivered" ? sum + product.total_amount : sum, 0)
//             );

//             const returnedData = data.filter(order => 
//                 order.products.some(product => product.status === "returned")
//             ).map(order => order.products.reduce((sum, product) => 
//                 product.status === "returned" ? sum + product.total_amount : sum, 0)
//             );

//             return new Chart(ctx, {
//                 type: type,
//                 data: {
//                     labels: labels,
//                     datasets: [
//                         {
//                             label: 'Total Sales',
//                             data: totalSales,
//                             backgroundColor: getComputedStyle(chartContainer).getPropertyValue('--bar-color'),
//                             borderColor: getComputedStyle(chartContainer).getPropertyValue('--bar-border-color'),
//                             borderWidth: 1,
//                             fill: true,
//                         },
//                         {
//                             label: 'Delivered Products',
//                             data: deliveredData,
//                             backgroundColor: getComputedStyle(chartContainer).getPropertyValue('--delivered-bar-color'),
//                             borderColor: getComputedStyle(chartContainer).getPropertyValue('--delivered-bar-border'),
//                             borderWidth: 1,
//                             fill: false,
//                         },
//                         {
//                             label: 'Returned Products',
//                             data: returnedData,
//                             backgroundColor: getComputedStyle(chartContainer).getPropertyValue('--returned-bar-color'),
//                             borderColor: getComputedStyle(chartContainer).getPropertyValue('--returned-bar-border'),
//                             borderWidth: 1,
//                             fill: false,
//                         }
//                     ]
//                 },
//                 options: {
//                     plugins: {
//                         legend: {
//                             display: true,
//                             labels: {
//                                 color: getComputedStyle(chartContainer).getPropertyValue('--label-color'),
//                             }
//                         },
//                         tooltip: {
//                             backgroundColor: getComputedStyle(chartContainer).getPropertyValue('--tooltip-bg'),
//                             titleColor: getComputedStyle(chartContainer).getPropertyValue('--tooltip-title'),
//                             bodyColor: getComputedStyle(chartContainer).getPropertyValue('--tooltip-body'),
//                         }
//                     },
//                     responsive: true,
//                     maintainAspectRatio: false,
//                     scales: {
//                         x: {
//                             grid: {
//                                 color: getComputedStyle(chartContainer).getPropertyValue('--grid-color'),
//                             },
//                             ticks: {
//                                 color: getComputedStyle(chartContainer).getPropertyValue('--label-color'),
//                             }
//                         },
//                         y: {
//                             beginAtZero: true,
//                             grid: {
//                                 color: getComputedStyle(chartContainer).getPropertyValue('--grid-color'),
//                             },
//                             ticks: {
//                                 color: getComputedStyle(chartContainer).getPropertyValue('--label-color'),
//                             }
//                         },
//                     }
//                 },
//             });
//         }

//         // Initialize pagination
//         updatePaginationControls();
//     });
// </script>
// </body>
// </html>