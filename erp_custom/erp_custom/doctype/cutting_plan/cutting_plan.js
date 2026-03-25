// Copyright (c) 2026, maze and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Cutting Plan", {
// 	refresh(frm) {

// 	},
// });

// ===============================
// EXISTING CODE (UNCHANGED)
// ===============================
frappe.ui.form.on("Cutting Plan", {
    refresh(frm) {

        if (frm.doc.docstatus === 1) {

            frm.add_custom_button("Create Material Request", function () {

                frappe.call({
                    method: "erp_custom.erp_custom.doctype.cutting_plan.cutting_plan.make_material_request",
                    args: {
                        cutting_plan: frm.doc.name
                    },
                    callback: function (r) {
                        if (r.message) {
                            frappe.set_route("Form", "Material Request", r.message);
                        }
                    }
                });

            }, "Create");
        }

        update_job_no_from_child(frm);
    },

    validate(frm) {
        update_job_no_from_child(frm);
    }
});


// ===============================
// CHILD TABLE TRIGGERS
// ===============================
frappe.ui.form.on("Cutting Plan Plate Details", {

    job_no(frm, cdt, cdn) {
        update_job_no_from_child(frm);
    },

    cutting_plan_plate_details_add(frm) {
        update_job_no_from_child(frm);
    },

    cutting_plan_plate_details_remove(frm) {
        update_job_no_from_child(frm);
    }
});


// ===============================
// COMMON FUNCTION (FINAL CORRECT)
// ===============================
function update_job_no_from_child(frm) {
    let unique_jobs = {};

    (frm.doc.cutting_plan_plate_details || []).forEach(row => {
        if (row.job_no && row.job_no.trim() !== "") {
            unique_jobs[row.job_no] = true;
        }
    });

    // clear old values
    frm.clear_table("job_no");

    // delay ensures values are ready
    setTimeout(() => {

        Object.keys(unique_jobs).forEach(job => {
            let child = frm.add_child("job_no");
            child.job_no = job;
        });

        frm.refresh_field("job_no");

    }, 100);
}