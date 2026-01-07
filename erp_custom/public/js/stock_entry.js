// frappe.ui.form.on("Stock Entry", {
//     onload_post_render(frm) {
//         frm.trigger("auto_fetch_custom_dimensions");
//     },

//     work_order(frm) {
//         frm.trigger("auto_fetch_custom_dimensions");
//     },

//     auto_fetch_custom_dimensions(frm) {
//         // Only proceed if Work Order exists
//         if (!frm.doc.work_order) return;

//         frappe.call({
//             method: "frappe.client.get",
//             args: {
//                 doctype: "Work Order",
//                 name: frm.doc.work_order
//             },
//             callback: function(r) {
//                 if (!r.message) return;

//                 const work_order = r.message;
//                 const work_order_items = work_order.required_items || [];

//                 // Create quick lookup by item_code
//                 const item_map = {};
//                 work_order_items.forEach(it => {
//                     item_map[it.item_code] = {
//                         custom_length: it.custom_length || 0,
//                         custom_width: it.custom_width || 0,
//                         custom_thickness: it.custom_thickness || 0
//                     };
//                 });

//                 // Automatically update Stock Entry Items
//                 (frm.doc.items || []).forEach(se_item => {
//                     const match = item_map[se_item.item_code];
//                     if (match) {
//                         frappe.model.set_value(se_item.doctype, se_item.name, "custom_length", match.custom_length);
//                         frappe.model.set_value(se_item.doctype, se_item.name, "custom_width", match.custom_width);
//                         frappe.model.set_value(se_item.doctype, se_item.name, "custom_thickness", match.custom_thickness);
//                     }
//                 });

//                 frm.refresh_field("items");
//             }
//         });
//     }
// });



// MK Anna
// frappe.ui.form.on("Stock Entry", {
//     refresh(frm) {
//         // Check docstatus to ensure it's a valid document
//         if (frm.doc.docstatus < 2) {
//             // Remove default button if already exists (optional)
//             frm.remove_custom_button(__('Material Request'), __('Create'));

//             // Add your enhanced button
//             frm.add_custom_button(
//                 __("Material Request"),
//                 function () {
//                     create_material_request_with_custom_fields(frm);
//                 },
//                 __("Create")
//             );
//         }
//     },
// });

// // ✅ Function to create Material Request and copy custom fields
// function create_material_request_with_custom_fields(frm) {
//     frappe.model.with_doctype("Material Request", function () {
//         let mr = frappe.model.get_new_doc("Material Request");

//         // link parent field
//         mr.work_order = frm.doc.work_order;
//         mr.custom_work_order = frm.doc.work_order; // optional duplicate link

//         // get selected or all items
//         let items = frm.get_field("items").grid.get_selected_children();
//         if (!items.length) {
//             items = frm.doc.items || [];
//         }

//         // loop through each Stock Entry Detail item
//         items.forEach(item => {
//             let mr_item = frappe.model.add_child(mr, "items");

//             // --- default fields ---
//             mr_item.item_code = item.item_code;
//             mr_item.item_name = item.item_name;
//             mr_item.uom = item.uom;
//             mr_item.stock_uom = item.stock_uom;
//             mr_item.conversion_factor = item.conversion_factor;
//             mr_item.item_group = item.item_group;
//             mr_item.description = item.description;
//             mr_item.qty = item.qty;
//             mr_item.warehouse = item.s_warehouse;
//             mr_item.required_date = frappe.datetime.nowdate();

//             // ---  our custom fields  ---
//             mr_item.custom_work_order = frm.doc.work_order;
//             mr_item.custom_length = item.custom_length;
//             mr_item.custom_width = item.custom_width;
//             mr_item.custom_thickness = item.custom_thickness;
//         });

//         frappe.set_route("Form", "Material Request", mr.name);
//     });
// }








// ----------------------------------------------
// 🔹 Work Order → Stock Entry (auto fetch custom dimensions + item group)
// ----------------------------------------------
frappe.ui.form.on("Stock Entry", {
    onload_post_render(frm) {
        frm.trigger("fetch_dimensions_from_work_order");
    },

    work_order(frm) {
        frm.trigger("fetch_dimensions_from_work_order");
    },

    fetch_dimensions_from_work_order(frm) {
        if (!frm.doc.work_order) return;

        frappe.call({
            method: "frappe.client.get",
            args: { doctype: "Work Order", name: frm.doc.work_order },
            callback(r) {
                if (!r.message) return;

                const item_map = {};
                (r.message.required_items || []).forEach(it => {
                    item_map[it.item_code] = {
                        custom_length: it.custom_length || 0,
                        custom_width: it.custom_width || 0,
                        custom_thickness: it.custom_thickness || 0,
                        custom_density: it.custom_density || 0,
                        custom_kilogramskgs: it.custom_kilogramskgs || 0,
                        custom_outer_diameter: it.custom_outer_diameter || 0,
                        custom_inner_diameter: it.custom_inner_diameter || 0,
                        custom_wall_thickness: it.custom_wall_thickness || 0,

                        custom_material_type: it.custom_material_type || "",
                        custom_scrap_margin_percentage: it.custom_scrap_margin_percentage || 0,
                        custom_scrap_margin_kg: it.custom_scrap_margin_kg || 0,
                        custom_transportation_cost___kg: it.custom_transportation_cost___kg || 0,
                        custom_transportation_cost_: it.custom_transportation_cost_ || 0
                    };
                });

                (frm.doc.items || []).forEach(se_item => {
                    const match = item_map[se_item.item_code];
                    if (!match) return;

                    // ----------------------------
                    // Work Order → Stock Entry
                    // ----------------------------
                    frappe.model.set_value(se_item.doctype, se_item.name, "custom_length", match.custom_length);
                    frappe.model.set_value(se_item.doctype, se_item.name, "custom_width", match.custom_width);
                    frappe.model.set_value(se_item.doctype, se_item.name, "custom_thickness", match.custom_thickness);
                    frappe.model.set_value(se_item.doctype, se_item.name, "custom_density", match.custom_density);
                    frappe.model.set_value(se_item.doctype, se_item.name, "custom_kilogramskgs", match.custom_kilogramskgs);
                    frappe.model.set_value(se_item.doctype, se_item.name, "custom_outer_diameter", match.custom_outer_diameter);
                    frappe.model.set_value(se_item.doctype, se_item.name, "custom_inner_diameter", match.custom_inner_diameter);
                    frappe.model.set_value(se_item.doctype, se_item.name, "custom_wall_thickness", match.custom_wall_thickness);

                    frappe.model.set_value(se_item.doctype, se_item.name, "custom_material_type", match.custom_material_type);
                    frappe.model.set_value(se_item.doctype, se_item.name, "custom_scrap_margin_", match.custom_scrap_margin_percentage);
                    frappe.model.set_value(se_item.doctype, se_item.name, "custom_scrap_margin_kg", match.custom_scrap_margin_kg);
                    frappe.model.set_value(se_item.doctype, se_item.name, "custom_transportation_cost___kg", match.custom_transportation_cost___kg);
                    frappe.model.set_value(se_item.doctype, se_item.name, "custom_transportation_cost_", match.custom_transportation_cost_);

                    // ----------------------------
                    // 🔹 Fetch Item Group from Item
                    // ----------------------------
                    if (!se_item.item_group && se_item.item_code) {
                        frappe.db.get_value("Item", se_item.item_code, "item_group",
                            r => {
                                if (r && r.item_group) {
                                    frappe.model.set_value(se_item.doctype, se_item.name, "item_group", r.item_group);
                                }
                            }
                        );
                    }
                });

                frm.refresh_field("items");
            }
        });
    }
});


// ----------------------------------------------
// 🔹 2. Stock Entry → Material Request (custom button)
// ----------------------------------------------
frappe.ui.form.on("Stock Entry", {
    refresh(frm) {
        // Only show if submitted or saved (not draft)
        if (frm.doc.docstatus < 2) {
            frm.remove_custom_button(__('Material Request'), __('Create'));

            frm.add_custom_button(
                __("Material Request"),
                function () {
                    create_material_request_with_custom_fields(frm);
                },
                __("Create")
            );
        }
    },
});

function create_material_request_with_custom_fields(frm) {
    frappe.model.with_doctype("Material Request", function () {
        let mr = frappe.model.get_new_doc("Material Request");

        // link Work Order
        mr.work_order = frm.doc.work_order;
        mr.custom_work_order = frm.doc.work_order;

        // get selected or all items
        let items = frm.get_field("items").grid.get_selected_children();
        if (!items.length) {
            items = frm.doc.items || [];
        }

        items.forEach(item => {
            let mr_item = frappe.model.add_child(mr, "items");

            // Standard Frappe fields
            mr_item.item_code = item.item_code;
            mr_item.item_name = item.item_name;
            mr_item.item_group = item.item_group;
            mr_item.uom = item.uom;
            mr_item.stock_uom = item.stock_uom;
            mr_item.conversion_factor = item.conversion_factor;
            mr_item.description = item.description;
            mr_item.qty = item.qty;
            mr_item.warehouse = item.s_warehouse;
            mr_item.required_date = frappe.datetime.nowdate();

            // Custom fields
            mr_item.custom_raw_material_type = item.custom_raw_material_type;
            mr_item.custom_work_order = frm.doc.work_order;

            mr_item.custom_length = item.custom_length;
            mr_item.custom_width = item.custom_width;
            mr_item.custom_thickness = item.custom_thickness;
            mr_item.custom_density = item.custom_density;
            mr_item.custom_kilogramskgs = item.custom_kilogramskgs;
            mr_item.custom_outer_diameter = item.custom_outer_diameter;
            mr_item.custom_inner_diameter = item.custom_inner_diameter;
            mr_item.custom_wall_thickness = item.custom_wall_thickness;
            mr_item.custom_base_weight = item.custom_base_weight;

            mr_item.custom_material_type = item.custom_material_type;
            mr_item.custom_scrap_margin_ = item.custom_scrap_margin_;
            mr_item.custom_scrap_margin_kg = item.custom_scrap_margin_kg;
            mr_item.custom_transportation_cost___kg = item.custom_transportation_cost___kg;
            mr_item.custom_transportation_cost_ = item.custom_transportation_cost_;
        });

        // Open the newly created MR
        frappe.set_route("Form", "Material Request", mr.name);
    });
}
