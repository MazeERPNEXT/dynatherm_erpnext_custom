// Copyright (c) 2026, maze and contributors
// For license information, please see license.txt

<<<<<<< HEAD
=======
// // frappe.ui.form.on("TPI Schedule", {
// // 	refresh(frm) {

// // 	},
// // });
// frappe.ui.form.on("TPI Schedule", {
//     refresh(frm) {
//         if (frm.is_new()) return;

//         frm.add_custom_button(
//             __("Inspection Report"),
//             function () {

//                 // ✅ Open NEW Inspection Report with link
//                 frappe.route_options = {
//                     tpi_schedule: frm.doc.name
//                 };

//                 frappe.set_route("Form", "Inspection Report", "new-inspection-report-1");
//             },
//             __("Create")
//         );
//     }
// });

// Copyright (c) 2026, maze and contributors
// For license information, please see license.txt

>>>>>>> e97803c (TPI Request and Schedule updates)
frappe.ui.form.on("TPI Schedule", {
    refresh(frm) {

        /* =====================================================
           BUTTON 1: FETCH FROM TPI REQUEST (NEW DOCUMENT ONLY)
        ====================================================== */
        if (frm.is_new()) {
            frm.add_custom_button(
                __("Fetch from TPI Request"),
                () => {
                    open_tpi_request_dialog(frm);
                }
            );
        }

        /* =====================================================
           BUTTON 2: CREATE INSPECTION REPORT (SAVED DOCUMENT)
        ====================================================== */
        if (!frm.is_new()) {
            frm.add_custom_button(
                __("Inspection Report"),
                function () {
                    frappe.route_options = {
                        tpi_schedule: frm.doc.name
                    };

                    frappe.set_route(
                        "Form",
                        "Inspection Report",
                        "new-inspection-report-1"
                    );
                },
                __("Create")
            );
        }
    }
});

/* =========================================================
   DIALOG: SELECT ONE OR MULTIPLE TPI REQUESTS
========================================================= */
function open_tpi_request_dialog(frm) {
    const dialog = new frappe.ui.Dialog({
        title: __("Select TPI Requests"),
        size: "large",
        fields: [
            {
                fieldname: "tpi_requests",
                fieldtype: "MultiSelectList",
                label: __("TPI Request Reference"),
                reqd: 1,
                get_data() {
                    return frappe.db.get_list("TPI Request", {
                        fields: ["name"],
                        order_by: "creation desc",
                        limit: 50
                    }).then(r => {
                        return r.map(d => ({
                            value: d.name,
                            description: d.name
                        }));
                    });
                }
            }
        ],
        primary_action_label: __("Fetch"),
        primary_action(values) {
            if (!values.tpi_requests || values.tpi_requests.length === 0) {
                frappe.msgprint(__("Please select at least one TPI Request"));
                return;
            }

            dialog.hide();
            fetch_tpi_request_data(frm, values.tpi_requests);
        }
    });

    dialog.show();
}

/* =========================================================
   FETCH DATA FROM TPI REQUEST AND POPULATE TPI SCHEDULE
========================================================= */
function fetch_tpi_request_data(frm, tpi_requests) {
<<<<<<< HEAD

=======
>>>>>>> e97803c (TPI Request and Schedule updates)
    // Clear existing inspection items
    frm.clear_table("inspection_item");

    let completed = 0;

    tpi_requests.forEach((req_name, index) => {
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "TPI Request",
                name: req_name
            },
            callback(r) {
                if (!r.message) return;

                const doc = r.message;

                // Set parent fields only once
                if (index === 0) {
<<<<<<< HEAD
                    //frm.set_value("tpi_request_reference", doc.name || "");
=======
                    frm.set_value("tpi_request_reference", doc.name || "");
>>>>>>> e97803c (TPI Request and Schedule updates)
                    frm.set_value("inspection_agency", doc.inspection_agency || "");
                    frm.set_value("location", doc.site_location || "");
                }

                // Copy child table rows
                if (doc.inspection_item && doc.inspection_item.length) {
                    doc.inspection_item.forEach(row => {
                        let child = frm.add_child("inspection_item");
<<<<<<< HEAD

=======
>>>>>>> e97803c (TPI Request and Schedule updates)
                        child.item_code = row.item_code || "";
                        child.item_name = row.item_name || "";
                        child.description = row.description || "";
                        child.inspection_status = row.inspection_status || "";
                        child.batch_no = row.batch_no || "";
                        child.bom = row.bom || "";
                        child.quality_inspection = row.quality_inspection || "";
                        child.project = row.project || "";
                        child.sales_order = row.sales_order || "";
                        child.customer = row.customer || "";
                        child.applicable_drawing = row.applicable_drawing || "";
<<<<<<< HEAD
                        child.tpir_reference_id = doc.name;
=======
>>>>>>> e97803c (TPI Request and Schedule updates)
                    });
                }

                completed++;

                if (completed === tpi_requests.length) {
                    frm.refresh_field("inspection_item");
<<<<<<< HEAD

=======
>>>>>>> e97803c (TPI Request and Schedule updates)
                    frappe.show_alert({
                        message: __("TPI Schedule populated successfully"),
                        indicator: "green"
                    });
                }
            }
        });
    });
}
<<<<<<< HEAD
=======

>>>>>>> e97803c (TPI Request and Schedule updates)
