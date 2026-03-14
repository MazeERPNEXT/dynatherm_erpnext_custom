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


frappe.ui.form.on("Request for Quotation", {
    refresh(frm) {

        // Remove buttons only in Draft
        if (frm.doc.docstatus === 0) {

            frm.remove_custom_button("Opportunity", "Get Items From");
            frm.remove_custom_button("Possible Supplier", "Get Items From");
            frm.remove_custom_button("Link to Material Requests", "Tools");

            // Ensure removal after ERPNext re-renders
            setTimeout(() => {
                frm.remove_custom_button("Opportunity", "Get Items From");
                frm.remove_custom_button("Possible Supplier", "Get Items From");
                frm.remove_custom_button("Link to Material Requests", "Tools");
            }, 500);
        }
    }
});