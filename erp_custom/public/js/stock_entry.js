frappe.ui.form.on("Stock Entry", {
    onload_post_render(frm) {
        frm.trigger("auto_fetch_custom_dimensions");
    },

    work_order(frm) {
        frm.trigger("auto_fetch_custom_dimensions");
    },

    auto_fetch_custom_dimensions(frm) {
        // Only proceed if Work Order exists
        if (!frm.doc.work_order) return;

        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Work Order",
                name: frm.doc.work_order
            },
            callback: function(r) {
                if (!r.message) return;

                const work_order = r.message;
                const work_order_items = work_order.required_items || [];

                // Create quick lookup by item_code
                const item_map = {};
                work_order_items.forEach(it => {
                    item_map[it.item_code] = {
                        custom_length: it.custom_length || 0,
                        custom_width: it.custom_width || 0,
                        custom_thickness: it.custom_thickness || 0
                    };
                });

                // Automatically update Stock Entry Items
                (frm.doc.items || []).forEach(se_item => {
                    const match = item_map[se_item.item_code];
                    if (match) {
                        frappe.model.set_value(se_item.doctype, se_item.name, "custom_length", match.custom_length);
                        frappe.model.set_value(se_item.doctype, se_item.name, "custom_width", match.custom_width);
                        frappe.model.set_value(se_item.doctype, se_item.name, "custom_thickness", match.custom_thickness);
                    }
                });

                frm.refresh_field("items");
            }
        });
    }
});
