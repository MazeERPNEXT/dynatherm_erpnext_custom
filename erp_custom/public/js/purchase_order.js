frappe.ui.form.on("Purchase Order", {
    refresh(frm) {
        frm.set_query("supplier", () => {
            return {
                filters: {
                    workflow_state: "Approved"
                }
            };
        });

        setTimeout(() => {
            let f = frm.fields_dict["supplier"];
            if (f && f.df) {
                f.df.get_query = function () {
                    return {
                        filters: {
                            workflow_state: "Approved"
                        }
                    };
                };
            }
        }, 0);
    }
});
