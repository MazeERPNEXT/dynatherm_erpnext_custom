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


frappe.ui.form.on("Stock Entry", {
    refresh(frm) {
        // Check docstatus to ensure it's a valid document
        if (frm.doc.docstatus < 2) {
            // Remove default button if already exists (optional)
            frm.remove_custom_button(__('Material Request'), __('Create'));

            // Add your enhanced button
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

// ✅ Function to create Material Request and copy custom fields
function create_material_request_with_custom_fields(frm) {
    frappe.model.with_doctype("Material Request", function () {
        let mr = frappe.model.get_new_doc("Material Request");

        // link parent field
        mr.work_order = frm.doc.work_order;
        mr.custom_work_order = frm.doc.work_order; // optional duplicate link

        // get selected or all items
        let items = frm.get_field("items").grid.get_selected_children();
        if (!items.length) {
            items = frm.doc.items || [];
        }

        // loop through each Stock Entry Detail item
        items.forEach(item => {
            let mr_item = frappe.model.add_child(mr, "items");

            // --- default fields ---
            mr_item.item_code = item.item_code;
            mr_item.item_name = item.item_name;
            mr_item.uom = item.uom;
            mr_item.stock_uom = item.stock_uom;
            mr_item.conversion_factor = item.conversion_factor;
            mr_item.item_group = item.item_group;
            mr_item.description = item.description;
            mr_item.qty = item.qty;
            mr_item.warehouse = item.s_warehouse;
            mr_item.required_date = frappe.datetime.nowdate();

            // --- ✅ your custom fields copied here ---
            mr_item.custom_work_order = frm.doc.work_order;
            mr_item.custom_length = item.custom_length;
            mr_item.custom_width = item.custom_width;
            mr_item.custom_thickness = item.custom_thickness;
        });

        frappe.set_route("Form", "Material Request", mr.name);
    });
}