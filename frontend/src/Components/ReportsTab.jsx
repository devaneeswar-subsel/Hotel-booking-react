import React, { useState, useEffect, useCallback } from "react";
import { DownloadIcon } from "../Icons";

/* ── REPORTS TAB ── */
export default function ReportsTab({ apiFetch, showToast }) {
  const [reportType, setReportType] = useState("weekly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // PAGINATION
  // =====================================================
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const totalRecords = reportData?.bookings?.length || 0;

  const totalPages = Math.max(1, Math.ceil(totalRecords / ITEMS_PER_PAGE));

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedBookings =
    reportData?.bookings?.slice(startIndex, endIndex) || [];

  // =====================================================
  // FETCH REPORT
  // =====================================================
  const fetchReport = useCallback(async () => {
    setLoading(true);

    try {
      let url = `/api/manager/reports?type=${reportType}`;

      if (reportType === "custom" && customStart && customEnd) {
        url = `/api/manager/reports?start_date=${customStart}&end_date=${customEnd}`;
      }

      const res = await apiFetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setReportData(data);

      // Always start from page 1 after generating a report
      setCurrentPage(1);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [reportType, customStart, customEnd, showToast, apiFetch]);

  useEffect(() => {
    fetchReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // =====================================================
  // REPORT TYPE CHANGE
  // =====================================================
  const handleReportTypeChange = (type) => {
    // Clear custom dates when leaving Custom
    if (type !== "custom") {
      setCustomStart("");
      setCustomEnd("");
    }

    // Reset pagination
    setCurrentPage(1);

    setReportType(type);
  };

  // =====================================================
  // PAGINATION HANDLERS
  // =====================================================
  const goToPage = (page) => {
    const safePage = Math.min(Math.max(page, 1), totalPages);

    setCurrentPage(safePage);

    // Scroll to table smoothly
    window.requestAnimationFrame(() => {
      const tableElement = document.getElementById("reports-bookings-table");

      if (tableElement) {
        tableElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  };

  // =====================================================
  // PDF DOWNLOAD
  // =====================================================
  async function downloadReport() {
    if (!reportData) return;

    const { jsPDF } = await import("jspdf");

    // A4 LANDSCAPE
    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "landscape",
    });

    const W = 297;
    const H = 210;

    const marginX = 12;
    const tableWidth = W - marginX * 2;

    // ===================================================
    // PDF COLORS
    // ===================================================
    const navy = [15, 25, 35];
    const gold = [201, 168, 76];
    const lightGray = [248, 249, 250];
    const textDark = [15, 25, 35];
    const textGray = [134, 142, 150];

    // ===================================================
    // PDF HEADER
    // ===================================================
    const drawPdfHeader = () => {
      doc.setFillColor(...navy);
      doc.rect(0, 0, W, 38, "F");

      // Hotel name
      doc.setFont("times", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...gold);
      doc.text("VV GRAND PARK", marginX, 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(180, 160, 100);
      doc.text("RESIDENCY", marginX, 22);

      // Report title
      const reportTitle =
        reportType === "weekly"
          ? "WEEKLY REPORT"
          : reportType === "monthly"
            ? "MONTHLY REPORT"
            : "CUSTOM REPORT";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);

      doc.text(reportTitle, W - marginX, 15, {
        align: "right",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(180, 170, 150);

      doc.text(
        `Period: ${reportData.startDate} to ${reportData.endDate}`,
        W - marginX,
        22,
        {
          align: "right",
        },
      );

      doc.text(
        `Generated: ${new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`,
        W - marginX,
        29,
        {
          align: "right",
        },
      );

      // Gold line
      doc.setDrawColor(...gold);
      doc.setLineWidth(0.5);
      doc.line(marginX, 45, W - marginX, 45);
    };

    // ===================================================
    // SUMMARY CARDS
    // ===================================================
    const s = reportData.summary;

    const summaryY = 51;

    const summaryBoxes = [
      {
        label: "Total Bookings",
        val: String(s.total_bookings || 0),
      },
      {
        label: "Confirmed",
        val: String(s.confirmed || 0),
      },
      {
        label: "Completed",
        val: String(s.completed || 0),
      },
      {
        label: "Total Revenue",
        val: `Rs.${Number(s.total_revenue || 0).toLocaleString()}`,
      },
    ];

    summaryBoxes.forEach((box, i) => {
      const boxWidth = 62;
      const boxGap = 6;

      const x = marginX + i * (boxWidth + boxGap);

      doc.setFillColor(...lightGray);

      doc.roundedRect(x, summaryY, boxWidth, 22, 3, 3, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...textGray);

      doc.text(box.label, x + boxWidth / 2, summaryY + 8, {
        align: "center",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...textDark);

      doc.text(box.val, x + boxWidth / 2, summaryY + 17, {
        align: "center",
      });
    });

    // ===================================================
    // GST / ADDON INFO
    // ===================================================
    const infoY = summaryY + 30;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(73, 80, 87);

    doc.text(
      `Total GST Collected: Rs.${Number(s.total_gst || 0).toLocaleString()}`,
      marginX,
      infoY,
    );

    doc.text(
      `Total Add-on Revenue: Rs.${Number(
        s.total_addons || 0,
      ).toLocaleString()}`,
      marginX,
      infoY + 7,
    );

    // ===================================================
    // PDF TABLE COLUMN CONFIGURATION
    // ===================================================
    const columns = [
      {
        key: "no",
        label: "#",
        width: 10,
        align: "center",
      },
      {
        key: "guest",
        label: "Guest",
        width: 42,
        align: "left",
      },
      {
        key: "room",
        label: "Room",
        width: 28,
        align: "left",
      },
      {
        key: "checkIn",
        label: "Check-in",
        width: 27,
        align: "center",
      },
      {
        key: "checkOut",
        label: "Check-out",
        width: 27,
        align: "center",
      },
      {
        key: "base",
        label: "Base",
        width: 24,
        align: "right",
      },
      {
        key: "addons",
        label: "Addons",
        width: 24,
        align: "right",
      },
      {
        key: "gst",
        label: "GST",
        width: 22,
        align: "right",
      },
      {
        key: "total",
        label: "Total",
        width: 28,
        align: "right",
      },
      {
        key: "status",
        label: "Status",
        width: 25,
        align: "center",
      },
    ];

    // Make sure widths exactly fit table
    const widthDifference =
      tableWidth - columns.reduce((sum, col) => sum + col.width, 0);

    if (widthDifference !== 0) {
      columns[1].width += widthDifference;
    }

    // ===================================================
    // DRAW TABLE HEADER
    // ===================================================
    const drawTableHeader = (y) => {
      const headerHeight = 11;

      doc.setFillColor(...navy);

      doc.rect(marginX, y, tableWidth, headerHeight, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(...gold);

      let x = marginX;

      columns.forEach((column) => {
        let textX;

        if (column.align === "left") {
          textX = x + 2;
        } else if (column.align === "right") {
          textX = x + column.width - 2;
        } else {
          textX = x + column.width / 2;
        }

        doc.text(column.label, textX, y + 7, {
          align:
            column.align === "right"
              ? "right"
              : column.align === "center"
                ? "center"
                : "left",
        });

        x += column.width;
      });

      return y + headerHeight + 5;
    };

    // ===================================================
    // DRAW FOOTER
    // ===================================================
    const drawFooter = () => {
      const footerY = H - 10;

      doc.setDrawColor(...gold);
      doc.setLineWidth(0.3);

      doc.line(marginX, footerY - 5, W - marginX, footerY - 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...textGray);

      doc.text(
        "VV Grand Park Residency — Confidential Report",
        W / 2,
        footerY,
        {
          align: "center",
        },
      );
    };

    // ===================================================
    // INITIAL PAGE
    // ===================================================
    drawPdfHeader();

    let tableY = drawTableHeader(infoY + 18);

    // ===================================================
    // PDF BOOKINGS
    // ===================================================
    reportData.bookings.forEach((b, index) => {
      const rowHeight = 10;

      // New page before row
      if (tableY + rowHeight > H - 20) {
        drawFooter();

        doc.addPage();

        drawPdfHeader();

        tableY = drawTableHeader(51);
      }

      // Alternating background
      if (index % 2 === 0) {
        doc.setFillColor(...lightGray);

        doc.rect(marginX, tableY - 7, tableWidth, rowHeight, "F");
      }

      doc.setFont("helvetica", "normal");

      doc.setFontSize(7);

      doc.setTextColor(...textDark);

      // -----------------------------------------------
      // DATA
      // -----------------------------------------------
      let guestName = b.guest_name || "—";

      if (guestName.length > 25) {
        guestName = guestName.substring(0, 24) + "…";
      }

      let roomType = b.room_type || "—";

      if (roomType.length > 16) {
        roomType = roomType.substring(0, 15) + "…";
      }

      const checkIn = b.check_in_date ? b.check_in_date.slice(0, 10) : "—";

      const checkOut = b.check_out_date ? b.check_out_date.slice(0, 10) : "—";

      const baseAmount = Number(b.total_price || 0);

      const addonAmount = Number(b.addon_charges || 0);

      const gstAmount = Number(b.gst_amount || 0);

      const totalAmount = Number(b.final_total || b.total_price || 0);

      const status = (b.status || "—").toUpperCase();

      // -----------------------------------------------
      // STATUS COLOR
      // -----------------------------------------------
      const statusColor = {
        CONFIRMED: [45, 154, 110],
        COMPLETED: [36, 113, 163],
        CANCELLED: [192, 57, 43],
      }[status] || [134, 142, 150];

      // -----------------------------------------------
      // DRAW CELLS
      // -----------------------------------------------
      let x = marginX;

      columns.forEach((column) => {
        let value = "";
        let align = column.align;

        switch (column.key) {
          case "no":
            value = String(b.booking_id ?? "—");
            break;

          case "guest":
            value = guestName;
            break;

          case "room":
            value = roomType;
            break;

          case "checkIn":
            value = checkIn;
            break;

          case "checkOut":
            value = checkOut;
            break;

          case "base":
            value = `Rs.${baseAmount.toLocaleString()}`;
            break;

          case "addons":
            value = `Rs.${addonAmount.toLocaleString()}`;
            break;

          case "gst":
            value = `Rs.${gstAmount.toLocaleString()}`;
            break;

          case "total":
            value = `Rs.${totalAmount.toLocaleString()}`;
            break;

          case "status":
            value = status;

            if (value.length > 10) {
              value = value.substring(0, 9) + "…";
            }
            break;

          default:
            value = "—";
        }

        // Status color
        if (column.key === "status") {
          doc.setTextColor(...statusColor);
        } else if (column.key === "total") {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...textDark);
        } else if (column.key === "guest") {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...textDark);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...textDark);
        }

        let textX;

        if (align === "left") {
          textX = x + 2;
        } else if (align === "right") {
          textX = x + column.width - 2;
        } else {
          textX = x + column.width / 2;
        }

        doc.text(value, textX, tableY, {
          align:
            align === "right"
              ? "right"
              : align === "center"
                ? "center"
                : "left",
        });

        x += column.width;
      });

      tableY += rowHeight;
    });

    // ===================================================
    // GRAND TOTAL
    // ===================================================
    if (tableY + 20 > H - 20) {
      drawFooter();

      doc.addPage();

      drawPdfHeader();

      tableY = drawTableHeader(51);
    }

    tableY += 4;

    doc.setDrawColor(...gold);
    doc.setLineWidth(0.4);

    doc.line(marginX, tableY, W - marginX, tableY);

    tableY += 7;

    doc.setFont("helvetica", "bold");

    doc.setFontSize(9);

    doc.setTextColor(...textDark);

    doc.text("GRAND TOTAL REVENUE", marginX, tableY);

    doc.setTextColor(...gold);

    doc.text(
      `Rs.${Number(s.total_revenue || 0).toLocaleString()}`,
      W - marginX,
      tableY,
      {
        align: "right",
      },
    );

    // Footer on final page
    drawFooter();

    // ===================================================
    // SAVE PDF
    // ===================================================
    const reportTitle =
      reportType === "weekly"
        ? "WEEKLY_REPORT"
        : reportType === "monthly"
          ? "MONTHLY_REPORT"
          : "CUSTOM_REPORT";

    doc.save(
      `VVGrandPark_${reportTitle}_${reportData.startDate}_to_${reportData.endDate}.pdf`,
    );
  }

  // =====================================================
  // UI CLASSES
  // =====================================================
  const customLabelClass =
    "text-[0.62rem] font-bold text-[#868E96] mb-1 tracking-[0.8px] uppercase";

  const customInputClass =
    "p-2 rounded-md border-[1.5px] border-[#E9ECEF] text-[0.82rem] font-inherit focus:outline-none text-[#212529]";

  const thClass =
    "px-3 py-2.5 !text-center text-[0.6rem] font-bold text-[#868E96] uppercase tracking-[1px] border-b-[1.5px] border-[#E9ECEF] bg-[#F8F9FA] whitespace-nowrap";

  return (
    <div>
      {/* =================================================
          CONFIGURATION
      ================================================= */}
      <div className="bg-white rounded-[14px] px-[22px] py-5 border border-[#E9ECEF] mb-5">
        <div className="font-body text-[1rem] font-semibold text-[#0F1923] mb-4">
          Generate Report
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          {["weekly", "monthly", "custom"].map((type) => (
            <button
              key={type}
              onClick={() => handleReportTypeChange(type)}
              className={`px-5 py-2 rounded-md border-[1.5px] text-[0.82rem] font-semibold cursor-pointer font-inherit capitalize transition-colors duration-150 ${
                reportType === type
                  ? "border-[#0F1923] bg-[#0F1923] text-white"
                  : "border-[#E9ECEF] bg-white text-[#495057]"
              }`}
            >
              {type}
            </button>
          ))}

          {reportType === "custom" && (
            <>
              <div className="flex flex-col">
                <div className={customLabelClass}>Start Date</div>

                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className={customInputClass}
                />
              </div>

              <div className="flex flex-col">
                <div className={customLabelClass}>End Date</div>

                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className={customInputClass}
                />
              </div>
            </>
          )}

          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-5 py-[9px] rounded-md bg-[#C9A84C] text-white border-none text-[0.82rem] font-semibold cursor-pointer font-inherit disabled:opacity-70"
          >
            {loading ? "Loading..." : "Generate"}
          </button>
        </div>
      </div>

      {/* =================================================
          REPORT DISPLAY
      ================================================= */}
      {reportData && (
        <>
          {/* KEY METRICS */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5 mb-5">
            {[
              {
                label: "Total Bookings",
                val: reportData.summary.total_bookings || 0,
                color: "border-l-[#2471A3]",
              },
              {
                label: "Total Revenue",
                val: `Rs.${Number(
                  reportData.summary.total_revenue || 0,
                ).toLocaleString()}`,
                color: "border-l-[#C9A84C]",
              },
              {
                label: "GST Collected",
                val: `Rs.${Number(
                  reportData.summary.total_gst || 0,
                ).toLocaleString()}`,
                color: "border-l-[#2D9A6E]",
              },
              {
                label: "Add-on Revenue",
                val: `Rs.${Number(
                  reportData.summary.total_addons || 0,
                ).toLocaleString()}`,
                color: "border-l-[#9B59B6]",
              },
              {
                label: "Confirmed",
                val: reportData.summary.confirmed || 0,
                color: "border-l-[#2D9A6E]",
              },
              {
                label: "Completed",
                val: reportData.summary.completed || 0,
                color: "border-l-[#2471A3]",
              },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                className={`bg-white border border-[#E9ECEF] border-l-4 ${color} px-[18px] py-4 rounded-xl`}
              >
                <div className="text-[0.62rem] font-bold text-[#868E96] tracking-[1px] uppercase mb-1.5">
                  {label}
                </div>

                <div className="font-body text-[1.4rem] font-semibold text-[#0F1923]">
                  {val}
                </div>
              </div>
            ))}
          </div>

          {/* PDF DOWNLOAD */}
          <div className="mb-5">
            <button
              onClick={downloadReport}
              className="px-7 py-3 bg-[#0F1923] text-[#C9A84C] border-none rounded-md font-inherit font-bold text-[0.9rem] cursor-pointer flex items-center gap-2"
            >
              <DownloadIcon size={16} color="#C9A84C" />
              Download{" "}
              {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
              PDF
            </button>
          </div>

          {/* =================================================
              TABLE
          ================================================= */}
          <div
            id="reports-bookings-table"
            className="bg-white rounded-[14px] px-[22px] py-5 border border-[#E9ECEF]"
          >
            <div className="font-body text-[1rem] font-semibold text-[#0F1923] mb-4">
              Bookings ({reportData.startDate} → {reportData.endDate})
              <span className="text-[0.78rem] font-normal text-[#868E96] ml-2">
                ({totalRecords} records)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[1000px]">
                <thead>
                  <tr>
                    {[
                      "#",
                      "Guest",
                      "Room",
                      "Check-in",
                      "Check-out",
                      "Base",
                      "Addons",
                      "GST",
                      "Total",
                      "Status",
                    ].map((h) => (
                      <th key={h} className={thClass}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {totalRecords === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="p-[30px] text-center text-[#868E96] text-[0.85rem]"
                      >
                        No bookings in this period
                      </td>
                    </tr>
                  ) : (
                    paginatedBookings.map((b) => (
                      <tr
                        key={b.booking_id}
                        className="border-t border-[#F1F3F5]"
                      >
                        <td className="px-3 py-2.5 text-center text-[0.75rem] text-[#868E96]">
                          #{b.booking_id}
                        </td>

                        <td className="px-3 py-2.5 text-center text-[0.82rem] font-semibold text-[#0F1923] whitespace-nowrap">
                          {b.guest_name}
                        </td>

                        <td className="px-3 py-2.5 text-center text-[0.78rem] text-[#495057]">
                          {b.room_type}
                        </td>

                        <td className="px-3 py-2.5 text-center text-[0.78rem] text-[#495057] whitespace-nowrap">
                          {b.check_in_date?.slice(0, 10)}
                        </td>

                        <td className="px-3 py-2.5 text-center text-[0.78rem] text-[#495057] whitespace-nowrap">
                          {b.check_out_date?.slice(0, 10)}
                        </td>

                        <td className="px-3 py-2.5 text-center text-[0.78rem] text-[#495057] whitespace-nowrap">
                          Rs.
                          {Number(b.total_price || 0).toLocaleString()}
                        </td>

                        <td className="px-3 py-2.5 text-center text-[0.78rem] text-[#C9A84C] font-semibold whitespace-nowrap">
                          Rs.
                          {Number(b.addon_charges || 0).toLocaleString()}
                        </td>

                        <td className="px-3 py-2.5 text-center text-[0.78rem] text-[#868E96] whitespace-nowrap">
                          Rs.
                          {Number(b.gst_amount || 0).toLocaleString()}
                        </td>

                        <td className="px-3 py-2.5 text-center text-[0.85rem] font-bold text-[#0F1923] whitespace-nowrap">
                          Rs.
                          {Number(
                            b.final_total || b.total_price || 0,
                          ).toLocaleString()}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-[3px] text-[0.6rem] font-bold uppercase tracking-wide ${
                              b.status === "confirmed"
                                ? "bg-[#E8F8F0] text-[#2D9A6E]"
                                : b.status === "cancelled"
                                  ? "bg-[#FDECEA] text-[#C0392B]"
                                  : "bg-[#EAF2FB] text-[#2471A3]"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {totalRecords > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#0F1923]">
                      <td
                        colSpan={8}
                        className="px-3 py-2.5 font-body font-bold text-[#0F1923] text-[0.85rem]"
                      >
                        TOTAL REVENUE
                      </td>

                      <td
                        colSpan={2}
                        className="px-3 py-2.5 font-body font-bold text-[#C9A84C] text-[1rem] text-center"
                      >
                        Rs.
                        {Number(
                          reportData.summary.total_revenue || 0,
                        ).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* =================================================
                PAGINATION
            ================================================= */}
            {totalRecords > ITEMS_PER_PAGE && (
              <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-[#E9ECEF]">
                {/* Showing text */}
                <div className="text-[0.75rem] text-[#868E96]">
                  Showing{" "}
                  <span className="font-semibold text-[#495057]">
                    {startIndex + 1}
                  </span>{" "}
                  -{" "}
                  <span className="font-semibold text-[#495057]">
                    {Math.min(endIndex, totalRecords)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-[#495057]">
                    {totalRecords}
                  </span>{" "}
                  records
                </div>

                {/* Pagination controls */}
                <div className="flex items-center gap-1">
                  {/* Previous */}
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => goToPage(currentPage - 1)}
                    className={`min-w-[34px] h-[34px] px-2 rounded-md border text-[0.75rem] font-semibold transition ${
                      currentPage === 1
                        ? "border-[#E9ECEF] bg-[#F8F9FA] text-[#CED4DA] cursor-not-allowed"
                        : "border-[#E9ECEF] bg-white text-[#495057] hover:bg-[#F8F9FA] cursor-pointer"
                    }`}
                  >
                    ‹
                  </button>

                  {/* Page numbers */}
                  {Array.from(
                    {
                      length: totalPages,
                    },
                    (_, i) => i + 1,
                  ).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => goToPage(page)}
                      className={`min-w-[34px] h-[34px] px-2 rounded-md border text-[0.75rem] font-semibold transition ${
                        currentPage === page
                          ? "border-[#0F1923] bg-[#0F1923] text-white"
                          : "border-[#E9ECEF] bg-white text-[#495057] hover:bg-[#F8F9FA] cursor-pointer"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  {/* Next */}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                    className={`min-w-[34px] h-[34px] px-2 rounded-md border text-[0.75rem] font-semibold transition ${
                      currentPage === totalPages
                        ? "border-[#E9ECEF] bg-[#F8F9FA] text-[#CED4DA] cursor-not-allowed"
                        : "border-[#E9ECEF] bg-white text-[#495057] hover:bg-[#F8F9FA] cursor-pointer"
                    }`}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
