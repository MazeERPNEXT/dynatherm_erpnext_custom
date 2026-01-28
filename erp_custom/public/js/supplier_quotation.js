frappe.ui.form.on("Supplier Quotation", {
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
