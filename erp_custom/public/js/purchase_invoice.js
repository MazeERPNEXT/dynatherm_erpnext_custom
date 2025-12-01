frappe.ui.form.on("Purchase Invoice", {
    refresh(frm) {
        // Filter for Supplier (already working for you)
        frm.set_query("supplier", () => {
            return {
                filters: { workflow_state: "Approved" }
            };
        });

        // Filter for Item Code inside the child table
        frm.fields_dict["items"].grid.get_field("item_code").get_query = function (doc, cdt, cdn) {
            return {
                filters: {
                    workflow_state: "Approved",
                    is_purchase_item: 1,  
                    has_variants: 0    
                }
            };
        };
    }
});