frappe.ui.form.on("Supplier Quotation", {
    refresh(frm) {

        // Remove Quotation button from Create menu after submit
        if (frm.doc.docstatus === 1) {

            // remove button
            frm.remove_custom_button("Quotation", "Create");

            // sometimes ERPNext re-renders, so ensure removal again
            setTimeout(() => {
                frm.remove_custom_button("Quotation", "Create");
            }, 500);
        }
    },
    onload_post_render(frm) {
        (frm.doc.items || []).forEach(row => {

            if (!row.request_for_quotation || !row.item_code) return;

            frappe.db.get_doc("Request for Quotation", row.request_for_quotation)
                .then(rfq => {
                    let rfq_item = rfq.items.find(
                        i => i.name === row.request_for_quotation_item
                    );

                    if (rfq_item && rfq_item.custom_total_weight) {
                        row.custom_total_weights = rfq_item.custom_total_weight;
                        frm.refresh_field("items");
                    }
                });
        });
    }
});
