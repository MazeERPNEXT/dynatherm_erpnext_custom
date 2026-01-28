// frappe.ui.form.on("Supplier Quotation Item", {
//     request_for_quotation_item(frm, cdt, cdn) {
//         let row = locals[cdt][cdn];

//         if (!row.request_for_quotation_item) return;

//         // fetch value from RFQ Item
//         frappe.db.get_value(
//             "Request for Quotation Item",
//             row.request_for_quotation_item,
//             "custom_total_weight",
//             (r) => {
//                 if (r && r.custom_total_weight !== undefined) {
//                     row.custom_total_weights = r.custom_total_weight;
//                     frm.refresh_field("items");
//                 }
//             }
//         );
//     }
// });
