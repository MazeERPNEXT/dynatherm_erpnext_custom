frappe.ui.form.on("Delivery Note", {
    refresh(frm) {
        // Filter for Customer
        frm.set_query("customer", () => {
            return {
                filters: { workflow_state: "Approved" }
            };
        });

        // Filter inside Items child table for Item Code
        frm.fields_dict["items"].grid.get_field("item_code").get_query = function (doc, cdt, cdn) {
            return {
                filters: {
                    workflow_state: "Approved",
                    is_sales_item: 1,  
                    has_variants: 0      
                }
            };
        };
    }
});
