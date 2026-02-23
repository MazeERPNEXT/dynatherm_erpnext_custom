// Copyright (c) 2026, maze and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Quality Assurance Plan", {
// 	refresh(frm) {

// 	},
// });


frappe.ui.form.on('Quality Assurance Plan', {
    refresh(frm) {

        if (!frm.is_new()) {

            let btn = frm.add_custom_button('Generate Dossier', function () {

                frappe.call({
                    doc: frm.doc,
                    method: "merge_pdfs",
                    callback: function (r) {
                        if (r.message) {
                            window.open(r.message);
                        }
                    }
                });

            });

            // Add professional color
            btn.addClass('btn-primary');

        }
    }
});