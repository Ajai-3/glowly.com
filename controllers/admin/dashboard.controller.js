import User from "../../models/user.model.js";
import Order from "../../models/order.model.js";
import { StatusCodes } from "../../helpers/StatusCodes.js";

// ========================================================================================
// RENDER SALES REPORT ON DASHBOARD
// ========================================================================================
// This function renders the sales report section of the admin dashboard, fetching
// and displaying the sales data, key metrics, and performance indicators to help admins
// monitor and analyze the sales performance of the system.
// ========================================================================================
export const renderDashboardPage = async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.admin.id, role: "admin" });
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const filter = req.query.filter || "all_time";
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    let matchStage = { "products.status": "delivered" };

    const now = new Date();
    if (filter === "today") {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      matchStage.createdAt = { $gte: startOfDay, $lte: endOfDay };
    } else if (filter === "this_week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      matchStage.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
    } else if (filter === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      matchStage.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (filter === "this_year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      matchStage.createdAt = { $gte: startOfYear, $lte: endOfYear };
    } else if (filter === "custom") {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    const totalsPipeline = [
      { $unwind: "$products" },
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: "$products.total_amount" },
          totalDiscount: {
            $sum: {
              $subtract: [
                "$products.total_amount",
                "$products.amount_after_coupon",
              ],
            },
          },
        },
      },
    ];

    const chartPipeline = [
      { $unwind: "$products" },
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: "$createdAt",
          },
          total_amount: { $sum: "$products.total_amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ];

    const tablePipeline = [
      { $unwind: "$products" },
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "products",
          localField: "products.product_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$_id",
          user_name: { $first: "$user.name" },
          createdAt: { $first: "$createdAt" },
          payment_method: { $first: "$payment_method" },
          products: { $push: "$products" },
          productDetails: { $push: "$productDetails" },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const [totalsData, chartData, orders] = await Promise.all([
      Order.aggregate(totalsPipeline),
      Order.aggregate(chartPipeline),
      Order.aggregate(tablePipeline),
    ]);

    const totals = totalsData[0] || {
      totalSales: 0,
      totalRevenue: 0,
      totalDiscount: 0,
    };

    const salesData = orders.flatMap((order) =>
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
    if (filter === "all_time") {
      const yearlyData = {};
      chartData.forEach((record) => {
        const year = new Date(record._id.date).getFullYear();
        if (!yearlyData[year]) {
          yearlyData[year] = { sales: 0, revenue: 0, orders: 0 };
        }
        yearlyData[year].sales += record.count;
        yearlyData[year].revenue += record.total_amount;
        yearlyData[year].orders += record.count;
      });
      processedChartData = Object.keys(yearlyData)
        .map((year) => ({
          date: year,
          sales: yearlyData[year].sales,
          revenue: yearlyData[year].revenue,
          orders: yearlyData[year].orders,
        }))
        .sort((a, b) => parseInt(a.date) - parseInt(b.date));
    } else if (filter === "this_year") {
      const months = [...Array(12)].map((_, i) =>
        new Date(2000, i).toLocaleString("en", { month: "short" })
      );
      const monthlyData = {};
      chartData.forEach((record) => {
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
        orders: monthlyData[index]?.orders || 0,
      }));
    } else if (filter === "today") {
      processedChartData = chartData.map((record) => ({
        date: new Date(record._id.date).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        sales: record.count,
        revenue: record.total_amount,
        orders: record.count,
      }));
    } else if (
      filter === "this_week" ||
      filter === "this_month" ||
      filter === "custom"
    ) {
      processedChartData = chartData.map((record) => ({
        date: new Date(record._id.date).toLocaleDateString(),
        sales: record.count,
        revenue: record.total_amount,
        orders: record.count,
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
      startDate: req.query.startDate || "",
      endDate: req.query.endDate || "",
      admin,
    });
  } catch (error) {
    console.error("Error fetching sales data:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

// ========================================================================================
// DOWNLOAD SALES DATA (PDF/EXCEL)
// ========================================================================================
// This function fetches filtered sales data based on the provided criteria (e.g., date range),
// and generates either a PDF or an Excel file for download, allowing the user to obtain the
// sales report in the selected format (PDF or Excel).
// ========================================================================================
export const salesData = async (req, res) => {
  try {
    const filter = req.query.filter || "all_time";
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    let matchStage = { "products.status": "delivered" };

    const now = new Date();
    if (filter === "today") {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      matchStage.createdAt = { $gte: startOfDay, $lte: endOfDay };
    } else if (filter === "this_week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      matchStage.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
    } else if (filter === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      matchStage.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (filter === "this_year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      matchStage.createdAt = { $gte: startOfYear, $lte: endOfYear };
    } else if (filter === "custom") {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    const totalsPipeline = [
      { $unwind: "$products" },
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: "$products.total_amount" },
          totalDiscount: {
            $sum: {
              $subtract: [
                "$products.total_amount",
                "$products.amount_after_coupon",
              ],
            },
          },
        },
      },
    ];

    const tablePipeline = [
      { $unwind: "$products" },
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "products",
          localField: "products.product_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$_id",
          user_name: { $first: "$user.name" },
          createdAt: { $first: "$createdAt" },
          payment_method: { $first: "$payment_method" },
          products: { $push: "$products" },
          productDetails: { $push: "$productDetails" },
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    const [totalsData, orders] = await Promise.all([
      Order.aggregate(totalsPipeline),
      Order.aggregate(tablePipeline),
    ]);

    const totals = totalsData[0] || {
      totalSales: 0,
      totalRevenue: 0,
      totalDiscount: 0,
    };

    const salesData = orders.flatMap((order) =>
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
      salesData,
    });
  } catch (error) {
    console.error("Error fetching all sales data:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};
