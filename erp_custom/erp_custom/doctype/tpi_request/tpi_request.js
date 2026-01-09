// frappe.ui.form.on("TPI Request", {

//     // 🔹 Button field action (already working)
//     fetch_item_from_quality_inspection(frm) {
//         if (!frm.doc.inspection_type) {
//             frappe.msgprint("Please select Inspection Type first");
//             return;
//         }

//         let d = new frappe.ui.form.MultiSelectDialog({
//             doctype: "Quality Inspection",
//             target: frm,
//             setters: {
//                 inspection_type: frm.doc.inspection_type
//             },
//             add_filters_group: 1,
//             get_query() {
//                 return {
//                     filters: {
//                         docstatus: 1,
//                         inspection_type: frm.doc.inspection_type
//                     }
//                 };
//             },
//             action(selections) {
//                 if (!selections.length) return;

//                 frappe.call({
//                     method: "erp_custom.erp_custom.doctype.tpi_request.tpi_request.get_inspection_items",
//                     args: {
//                         quality_inspections: selections
//                     },
//                     callback(r) {
//                         if (!r.message) return;

//                         frm.clear_table("inspection_item");

//                         r.message.forEach(row => {
//                             let child = frm.add_child("inspection_item");
//                             child.quality_inspection = row.qi;
//                             child.item_code = row.item_code;
//                             child.item_name = row.item_name;
//                             child.specification = row.specification;
//                             child.value = row.value;
//                             child.status = row.status;
//                         });

//                         frm.refresh_field("inspection_item");
//                     }
//                 });

//                 d.hide();
//             }
//         });
//     },

//     // 🔹 Add Schedule TPI button
//     refresh(frm) {
//         if (!frm.is_new() && frm.doc.docstatus < 2) {

//             // Optional: hide if already scheduled
//             if (frm.doc.status === "Inspection scheduled") return;

//             frm.add_custom_button(
//                 __("Schedule TPI"),
//                 function () {
//                     frappe.call({
//                         method: "erp_custom.erp_custom.doctype.tpi_request.tpi_request.create_tpi_schedule",
//                         args: {
//                             tpi_request: frm.doc.name
//                         },
//                         callback: function (r) {
//                             if (r.message) {
//                                 frappe.msgprint("TPI Schedule Created");
//                                 frappe.set_route("Form", "TPI Schedule", r.message);
//                             }
//                         }
//                     });
//                 },
//                 __("Create")
//             );
//         }
//     }
// });
frappe.ui.form.on("TPI Request", {

    // 🔹 Button field action (already working)
    fetch_item_from_quality_inspection(frm) {
        if (!frm.doc.inspection_type) {
            frappe.msgprint("Please select Inspection Type first");
            return;
        }

        let d = new frappe.ui.form.MultiSelectDialog({
            doctype: "Quality Inspection",
            target: frm,
            setters: {
                inspection_type: frm.doc.inspection_type
            },
            add_filters_group: 1,
            get_query() {
                return {
                    filters: {
                        docstatus: 1,
                        inspection_type: frm.doc.inspection_type
                    }
                };
            },
            action(selections) {
                if (!selections.length) return;

                frappe.call({
                    method: "erp_custom.erp_custom.doctype.tpi_request.tpi_request.get_inspection_items",
                    args: {
                        quality_inspections: selections
                    },
                    callback(r) {
                        if (!r.message) return;

                        frm.clear_table("inspection_item");

                        r.message.forEach(row => {
                            let child = frm.add_child("inspection_item");
                            child.quality_inspection = row.quality_inspection;
                            child.item_code = row.item_code;
                            child.item_name = row.item_name;
                            child.specification = row.specification;
                            child.value = row.value;
                            child.status = row.status;
                        });

                        frm.refresh_field("inspection_item");
                    }
                });

                d.hide();
            }
        });
    },

    refresh(frm) {
        if (frm.is_new()) return;
        if (frm.doc.docstatus >= 2) return;
        if (frm.doc.status === "Inspection scheduled") return;

        frm.add_custom_button(
            __("Schedule TPI"),
            function () {

                frappe.route_options = {
                    tpi_request_reference: frm.doc.name,
                    project: frm.doc.project,
                    inspection_agency: frm.doc.inspection_agency,
                    location: frm.doc.site_location,
                    scope_of_inspection: frm.doc.work_description
                };

                frappe.set_route("Form", "TPI Schedule", "new-tpi-schedule-1");
            },
            __("Create")
        );
    }
});
