// frappe.ui.form.on("Work Order Item", {
//     item_code: function(frm, cdt, cdn) {
//         const row = locals[cdt][cdn];

//         if (frm.doc.bom && row.item_code) {
//             frappe.call({
//                 method: "frappe.client.get_list",
//                 args: {
//                     doctype: "BOM Item",
//                     fields: ["custom_length", "custom_width", "custom_thickness","custom_density","custom_kilogramskgs"],
//                     filters: {
//                         parent: frm.doc.bom,
//                         item_code: row.item_code
//                     },
//                     limit_page_length: 1
//                 },
//                 callback: function(r) {
//                     if (r.message && r.message.length > 0) {
//                         const bom_item = r.message[0];

//                         frappe.model.set_value(cdt, cdn, "custom_length", bom_item.custom_length || 0);
//                         frappe.model.set_value(cdt, cdn, "custom_width", bom_item.custom_width || 0);
//                         frappe.model.set_value(cdt, cdn, "custom_thickness", bom_item.custom_thickness || 0);
//                         frappe.model.set_value(cdt, cdn, "custom_density", bom_item.custom_density || 0);
//                         frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", bom_item.custom_kilogramskgs || 0);

//                         frm.refresh_field("items");
//                     }
//                 }
//             });
//         }
//     }
// });



frappe.ui.form.on("Work Order Item", {
    item_code: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        if (frm.doc.bom && row.item_code) {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "BOM Item",
                    fields: ["custom_length", "custom_width", "custom_thickness","custom_density","custom_kilogramskgs","custom_raw_material_type","custom_outer_diameter","custom_inner_diameter","custom_wall_thickness","custom_base_weight","custom_total_weight"],
                    filters: {
                        parent: frm.doc.bom,
                        item_code: row.item_code
                    },
                    limit_page_length: 1
                },
                callback: function(r) {
                    if (r.message && r.message.length > 0) {
                        const bom_item = r.message[0];

                        frappe.model.set_value(cdt, cdn, "custom_length", bom_item.custom_length || 0);
                        frappe.model.set_value(cdt, cdn, "custom_width", bom_item.custom_width || 0);
                        frappe.model.set_value(cdt, cdn, "custom_thickness", bom_item.custom_thickness || 0);
                        frappe.model.set_value(cdt, cdn, "custom_density", bom_item.custom_density || 0);
                        frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", bom_item.custom_kilogramskgs || 0);

                        frappe.model.set_value(cdt, cdn, "custom_raw_material_type", bom_item.custom_raw_material_type || 0);
                        frappe.model.set_value(cdt, cdn, "custom_outer_diameter", bom_item.custom_outer_diameter || 0);
                        frappe.model.set_value(cdt, cdn, "custom_inner_diameter", bom_item.custom_inner_diameter || 0);
                        frappe.model.set_value(cdt, cdn, "custom_wall_thickness", bom_item.custom_wall_thickness || 0);
                        frappe.model.set_value(cdt, cdn, "custom_base_weight", bom_item.custom_base_weight || 0);
                        frappe.model.set_value(cdt, cdn, "custom_total_weight", bom_item.custom_total_weight || 0);

                        frm.refresh_field("items");
                    }
                }
            });
        }
    }
});



