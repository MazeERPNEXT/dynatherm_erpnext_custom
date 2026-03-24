
// frappe.ui.form.on('Quality Inspection', {

//     before_save(frm) {
//         let today = frappe.datetime.get_today();
//         let parts = today.split("-");
//         let formatted_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
//         frm.set_value('naming_series', `DAPL-INS-${formatted_date}`);
//     },

//     inspection_type(frm) {
//         const map = {
//             "Incoming": ["Purchase Receipt", "Purchase Invoice"],
//             "Outgoing": ["Sales Invoice", "Delivery Note"],
//             "In Progress": ["Job Card"]
//         };

//         let options = map[frm.doc.inspection_type] || [];

//         frm.set_value("reference_type", "");

//         frm.set_df_property(
//             "reference_type",
//             "options",
//             ["", ...options].join("\n")
//         );
//     },

//     refresh(frm) {
//         frm.trigger("inspection_type");
//     },

//     // 🔥 Trigger on BOTH fields
//     reference_type(frm) {
//         frm.set_value("custom_purchase_order_number", "");
//     },

//     reference_name(frm) {
//         get_po_number(frm);
//     }

// });


// // 🔥 COMMON FUNCTION (IMPORTANT)
// function get_po_number(frm) {

//     if (!frm.doc.reference_type || !frm.doc.reference_name) {
//         return;
//     }

//     console.log("Triggered:", frm.doc.reference_type, frm.doc.reference_name);

//     // Small delay to ensure value is set
//     setTimeout(() => {

//         let doctype = frm.doc.reference_type;

//         // Only handle PR & PI
//         if (!["Purchase Receipt", "Purchase Invoice"].includes(doctype)) {
//             frm.set_value("custom_purchase_order_number", "");
//             return;
//         }

//         frappe.call({
//             method: "frappe.client.get",
//             args: {
//                 doctype: doctype,
//                 name: frm.doc.reference_name
//             },
//             callback: function (r) {

//                 if (!r.message) {
//                     console.log("No data found");
//                     return;
//                 }

//                 let items = r.message.items || [];
//                 let po_list = [];

//                 items.forEach(item => {
//                     if (item.purchase_order && !po_list.includes(item.purchase_order)) {
//                         po_list.push(item.purchase_order);
//                     }
//                 });

//                 console.log("PO List:", po_list);

//                 frm.set_value(
//                     "custom_purchase_order_number",
//                     po_list.join(", ") || ""
//                 );
//             }
//         });

//     }, 300); // 🔥 IMPORTANT DELAY
// }


// frappe.ui.form.on('Quality Inspection', {

//     before_save(frm) {
//         let today = frappe.datetime.get_today();
//         let parts = today.split("-");
//         let formatted_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
//         frm.set_value('naming_series', `DAPL-INS-${formatted_date}`);
//     },

//     inspection_type(frm) {
//         const map = {
//             "Incoming": ["Purchase Receipt", "Purchase Invoice"],
//             "Outgoing": ["Sales Invoice", "Delivery Note"],
//             "In Progress": ["Job Card"]
//         };

//         let options = map[frm.doc.inspection_type] || [];

//         frm.set_value("reference_type", "");

//         frm.set_df_property(
//             "reference_type",
//             "options",
//             ["", ...options].join("\n")
//         );
//     },

//     refresh(frm) {
//         frm.trigger("inspection_type");
//     },

//     reference_type(frm) {
//         frm.set_value("custom_purchase_order_number", "");
//         frm.set_value("custom_project", "");
//     },

//     reference_name(frm) {
//         get_reference_details(frm);
//     }

// });

// function get_reference_details(frm) {
//     if (!frm.doc.reference_type || !frm.doc.reference_name) return;
//     let doctype = frm.doc.reference_type;
//     console.log("Triggered:", doctype, frm.doc.reference_name);

//     setTimeout(() => {
//         frappe.call({
//             method: "frappe.client.get",
//             args: {
//                 doctype: doctype,
//                 name: frm.doc.reference_name
//             },
//             callback: function (r) {
//                 if (!r.message) return;
//                 let doc = r.message;

//                 frm.set_value("custom_project", doc.project || "");

//                 // -------------------------------
//                 // 🔹 PURCHASE (PO)
//                 // -------------------------------
//                 if (["Purchase Receipt", "Purchase Invoice"].includes(doctype)) {

//                     let po_list = [];

//                     (doc.items || []).forEach(item => {
//                         if (item.purchase_order && !po_list.includes(item.purchase_order)) {
//                             po_list.push(item.purchase_order);
//                         }
//                     });

//                     frm.set_value(
//                         "custom_purchase_order_number",
//                         po_list.join(", ") || "No PO Linked"
//                     );
//                 }

//                 // -------------------------------
//                 // 🔹 SALES (SO)
//                 // -------------------------------
//                 else if (["Sales Invoice", "Delivery Note"].includes(doctype)) {

//                     let so_list = [];

//                     (doc.items || []).forEach(item => {
//                         if (item.sales_order && !so_list.includes(item.sales_order)) {
//                             so_list.push(item.sales_order);
//                         }
//                     });

//                     frm.set_value(
//                         "custom_purchase_order_number",
//                         so_list.join(", ") || "No SO Linked"
//                     );
//                 }

//                 // -------------------------------
//                 // 🔹 JOB CARD (WO)
//                 // -------------------------------
//                 else if (doctype === "Job Card") {

//                     frm.set_value(
//                         "custom_purchase_order_number",
//                         doc.work_order || "No Work Order"
//                     );
//                 }

//                 else {
//                     frm.set_value("custom_purchase_order_number", "");
//                 }

//             }
//         });

//     }, 300);
// }


frappe.ui.form.on('Quality Inspection', {

    before_save(frm) {
        let today = frappe.datetime.get_today();
        let parts = today.split("-");
        let formatted_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
        frm.set_value('naming_series', `DAPL-INS-${formatted_date}`);
    },

    inspection_type(frm) {
        const map = {
            "Incoming": ["Purchase Receipt", "Purchase Invoice"],
            "Outgoing": ["Sales Invoice", "Delivery Note"],
            "In Progress": ["Job Card"]
        };

        let options = map[frm.doc.inspection_type] || [];

        frm.set_value("reference_type", "");

        frm.set_df_property(
            "reference_type",
            "options",
            ["", ...options].join("\n")
        );

        // CLEAR ALL FIELDS WHEN TYPE CHANGES
        frm.set_value("custom_purchase_order_number", "");
        frm.set_value("custom_sales_order_number", "");
        frm.set_value("custom_work_order_number", "");
        frm.set_value("custom_project", "");
    },

    refresh(frm) {
        frm.trigger("inspection_type");
    },

    reference_type(frm) {
        // CLEAR ALL
        frm.set_value("custom_purchase_order_number", "");
        frm.set_value("custom_sales_order_number", "");
        frm.set_value("custom_work_order_number", "");
        frm.set_value("custom_project", "");
    },

    reference_name(frm) {
        get_reference_details(frm);
    }

});


// MAIN FUNCTION
function get_reference_details(frm) {

    if (!frm.doc.reference_type || !frm.doc.reference_name) return;

    let doctype = frm.doc.reference_type;

    setTimeout(() => {

        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: doctype,
                name: frm.doc.reference_name
            },
            callback: function (r) {

                if (!r.message) return;

                let doc = r.message;

                // -------------------------------
                // 🔹 PROJECT (HEADER + ITEMS)
                // -------------------------------
                let project_list = [];

                if (doc.project) {
                    project_list.push(doc.project);
                }

                (doc.items || []).forEach(item => {
                    if (item.project && !project_list.includes(item.project)) {
                        project_list.push(item.project);
                    }
                });

                frm.set_value("custom_project", project_list.join(", ") || "");

                // -------------------------------
                // 🔹 PURCHASE (PO)
                // -------------------------------
                if (["Purchase Receipt", "Purchase Invoice"].includes(doctype)) {

                    let po_list = [];

                    (doc.items || []).forEach(item => {
                        if (item.purchase_order && !po_list.includes(item.purchase_order)) {
                            po_list.push(item.purchase_order);
                        }
                    });

                    frm.set_value("custom_purchase_order_number", po_list.join(", ") || "No PO Linked");
                }

                // -------------------------------
                // 🔹 SALES (SO)
                // -------------------------------
                else if (["Sales Invoice", "Delivery Note"].includes(doctype)) {

                    let so_list = [];

                    (doc.items || []).forEach(item => {
                        if (item.sales_order && !so_list.includes(item.sales_order)) {
                            so_list.push(item.sales_order);
                        }
                    });

                    frm.set_value("custom_sales_order_number", so_list.join(", ") || "No SO Linked");
                }

                // -------------------------------
                // 🔹 JOB CARD (WO)
                // -------------------------------
                else if (doctype === "Job Card") {
                    frm.set_value("custom_work_order_number", doc.work_order || "No Work Order");
                }

            }
        });

    }, 300);
}