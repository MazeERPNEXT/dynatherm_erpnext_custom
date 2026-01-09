// Copyright (c) 2026, maze and contributors
// For license information, please see license.txt

// frappe.ui.form.on("TPI Schedule", {
// 	refresh(frm) {

// 	},
// });
frappe.ui.form.on("TPI Schedule", {
    refresh(frm) {
        if (frm.is_new()) return;

        frm.add_custom_button(
            __("Inspection Report"),
            function () {

                // ✅ Open NEW Inspection Report with link
                frappe.route_options = {
                    tpi_schedule: frm.doc.name
                };

                frappe.set_route("Form", "Inspection Report", "new-inspection-report-1");
            },
            __("Create")
        );
    }
});
