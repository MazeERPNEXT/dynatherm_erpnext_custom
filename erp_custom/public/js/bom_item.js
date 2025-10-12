// frappe.ui.form.on('BOM Item', {
//     custom_length: function(frm, cdt, cdn) { calculate_bom_item_weight(frm, cdt, cdn); },
//     custom_width: function(frm, cdt, cdn) { calculate_bom_item_weight(frm, cdt, cdn); },
//     custom_thickness: function(frm, cdt, cdn) { calculate_bom_item_weight(frm, cdt, cdn); },
//     custom_density: function(frm, cdt, cdn) { calculate_bom_item_weight(frm, cdt, cdn); },
// });

// function calculate_bom_item_weight(frm, cdt, cdn) {
//     const row = locals[cdt][cdn];
//     if (row.custom_length && row.custom_width && row.custom_thickness && row.custom_density) {
//         let weight = (row.custom_length * row.custom_width * row.custom_thickness * row.custom_density) / 1000000;
//         let final_weight = weight.toFixed(2);

//         frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", final_weight);
//         frappe.model.set_value(cdt, cdn, "weight_per_unit", final_weight);
//         frappe.model.set_value(cdt, cdn, "weight_uom", "Kg");

//         // ✅ Set the same value into qty
//         frappe.model.set_value(cdt, cdn, "qty", final_weight);
//     } else {
//         frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", 0);
//         frappe.model.set_value(cdt, cdn, "weight_per_unit", 0);
//         frappe.model.set_value(cdt, cdn, "weight_uom", "Kg");
//         frappe.model.set_value(cdt, cdn, "qty", 0);
//     }
// }
