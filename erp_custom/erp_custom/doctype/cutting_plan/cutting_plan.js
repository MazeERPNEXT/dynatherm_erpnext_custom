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

        // ================= EXISTING CODE (UNCHANGED) =================
        show_pdf_preview(frm);

        if (frm.doc.docstatus === 1) {

            frm.add_custom_button("Material Request", function () {

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

            frm.add_custom_button("Request for Quotation", function () {

                frappe.call({
                    method: "erp_custom.erp_custom.doctype.cutting_plan.cutting_plan.make_request_for_quotation",
                    args: {
                        cutting_plan: frm.doc.name
                    },
                    callback: function (r) {
                        if (r.message) {
                            frappe.set_route("Form", "Request for Quotation", r.message);
                        }
                    }
                });

            }, "Create");
        }

        update_job_no_from_child(frm);

        // ================= NEW UPLOAD BUTTON (SAFE ADD) =================
       if (frm.is_new()) {

    let btn = frm.add_custom_button('Upload', () => {

        new frappe.ui.FileUploader({
            allow_multiple: false,

            on_success(file) {

                frappe.call({
                    method: "erp_custom.erp_custom.doctype.cutting_plan.cutting_plan.upload_cutting_plan_excel",
                    args: {
                        file_url: file.file_url
                    },
                    freeze: true,

                    callback: function (r) {

                        if (!r.message) return;

                        frm.clear_table("cutting_plan_plate_details");
                        set_plate_number_options(frm); 

                        r.message.forEach(row => {
                            let child = frm.add_child("cutting_plan_plate_details");

                            for (let key in row) {
                                child[key] = row[key];
                            }
                        });

                        frm.refresh_field("cutting_plan_plate_details");

                        frappe.show_alert({
                            message: "Cutting Plan Imported Successfully",
                            indicator: "green"
                        });
                    }
                });

            }
        });

    });

    // UI styling
    btn.removeClass('btn-default')
       .addClass('btn-primary')
       .html('<svg class="icon icon-sm"><use href="#icon-upload"></use></svg>')
       .attr('title', 'Upload Cutting Plan')
       .css({
           'border-radius': '50%',
           'width': '38px',
           'height': '38px',
           'display': 'inline-flex',
           'align-items': 'center',
           'justify-content': 'center',
           'padding': '0',
       });
    }
    },

    // ================= EXISTING EVENTS (UNCHANGED) =================
    validate(frm) {
        update_job_no_from_child(frm);
    },

    cutting_diagram(frm) {
        show_pdf_preview(frm);
    }
});

// ===============================
// CHILD TABLE TRIGGERS
// ===============================
frappe.ui.form.on("Cutting Plan Plate Details", {
    qty: trigger,
    length: trigger,
    width: trigger,
    thickness: trigger,
    density: trigger,
    outer_diameter: trigger,
    inner_diameter: trigger,
    shape: trigger,
    item_group: trigger,

    job_no(frm, cdt, cdn) {
        update_job_no_from_child(frm);
    },

    cutting_plan_plate_details_add(frm) {
        update_job_no_from_child(frm);
        set_plate_number_options(frm); 
    },

    cutting_plan_plate_details_remove(frm) {
        update_job_no_from_child(frm);
        set_plate_number_options(frm); 
    },

    plate_number(frm) {
        set_plate_number_options(frm);  
    },
});

function trigger(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    frappe.call({
        method: "erp_custom.erp_custom.doctype.cutting_plan.cutting_plan.recalc_item",
        args: {
            item: JSON.stringify(row)
        },
        callback: function (r) {
            if (r.message) {
                Object.assign(row, r.message);   // ✅ SAME AS BOM
                frm.refresh_field("cutting_plan_plate_details");
            }
        }
    });
}

frappe.ui.form.on("Cutting Plan Item", {
    plate_number(frm, cdt, cdn) {
        set_plate_reference(frm, cdt, cdn);

        setTimeout(() => {
            calculate_balance_weight(frm);
        }, 100);
    },

    tag_no(frm, cdt, cdn) {
        set_plate_reference(frm, cdt, cdn);
    },

    form_render(frm, cdt, cdn) {
        set_plate_number_options(frm);   // ensure options available
    },

    total_weight(frm) {
        calculate_balance_weight(frm);
    },

    plate_reference_number(frm) {
        calculate_balance_weight(frm);
    },

    cutting_plan_item_add(frm) {
        calculate_balance_weight(frm);
    },

    cutting_plan_item_remove(frm) {
        calculate_balance_weight(frm);
    },

    project(frm, cdt, cdn) {

        let row = locals[cdt][cdn];

        if (!row.project) return;

        frappe.call({
            method: "erp_custom.erp_custom.doctype.cutting_plan.cutting_plan.get_bom_from_project",
            args: {
                project: row.project
            },
            callback: function (r) {

                if (!r.message) {
                    frappe.msgprint("No BOM found for this Project");
                    return;
                }

                frappe.model.set_value(cdt, cdn, {
                    tag_no: r.message.tag_no,
                    bom_no: r.message.bom_no
                });
            }
        });
    },

        bom_no(frm, cdt, cdn) {

        let row = locals[cdt][cdn];

        if (!row.bom_no) return;

        frappe.call({
            method: "erp_custom.erp_custom.doctype.cutting_plan.cutting_plan.get_part_numbers_from_bom",
            args: {
                bom_no: row.bom_no
            },
            callback: function (r) {

                if (!r.message) return;

                let options = r.message;

                // remove duplicates (extra safety)
                options = [...new Set(options)];

                frm.fields_dict["cutting_plan_item"]
                    .grid.update_docfield_property(
                        "part_number",
                        "options",
                        options.join("\n")
                    );
            }
        });
    },

    part_number(frm, cdt, cdn) {

        let row = locals[cdt][cdn];

        if (!row.bom_no || !row.part_number) return;

        frappe.call({
            method: "erp_custom.erp_custom.doctype.cutting_plan.cutting_plan.get_part_details",
            args: {
                bom_no: row.bom_no,
                part_number: row.part_number
            },
            callback: function (r) {

                if (!r.message) return;

                frappe.model.set_value(cdt, cdn, {
                    item_code: r.message.item_code,
                    qty: r.message.qty,
                    uom: r.message.uom,
                    item_group: r.message.item_group,
                    shape: r.message.shape,
                    length: r.message.length,
                    width: r.message.width,
                    thickness: r.message.thickness,
                    density: r.message.density,
                    outer_diameter: r.message.outer_diameter,
                    inner_diameter: r.message.inner_diameter,
                    kgs_per_unit: r.message.kgs_per_unit,
                    total_weight: r.message.total_weight,
                });
            }
        });
    }
});

function set_plate_reference(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    if (!row.plate_number) return;

    let plate_rows = frm.doc.cutting_plan_plate_details || [];

    let match = plate_rows.find(p => 
        p.plate_number === row.plate_number
    );

    if (match) {
        row.plate_reference_number = match.idx; 
        frm.refresh_field('cutting_plan_item');  
    }
}

function calculate_balance_weight(frm) {

    let plate_rows = frm.doc.cutting_plan_plate_details || [];
    let item_rows = frm.doc.cutting_plan_item || [];

    let exceeded_rows = [];

    // ✅ STEP 1: Reset ALL plates first
    plate_rows.forEach(plate => {
        plate.balance_weight = flt(plate.total_weight);
    });

    // ✅ STEP 2: Apply deductions fresh
    item_rows.forEach(item => {

        if (!item.plate_reference_number) return;

        let plate = plate_rows.find(p => p.idx == item.plate_reference_number);

        if (plate) {
            plate.balance_weight -= flt(item.total_weight);

            if (plate.balance_weight < 0) {
                plate.balance_weight = 0;
                exceeded_rows.push(plate.idx);
            }
        }
    });

    // ✅ STEP 3: Percentage
    plate_rows.forEach(plate => {

        let total = flt(plate.total_weight);

        if (total > 0) {
            plate.balance_percentage =
                ((plate.balance_weight / total) * 100).toFixed(2);
        } else {
            plate.balance_percentage = 0;
        }
    });

    // ✅ STEP 4: Warning
    if (exceeded_rows.length) {
        frappe.msgprint({
            title: __('Warning'),
            message: `Plate Row(s) ${[...new Set(exceeded_rows)].join(", ")} exceeded weight!`,
            indicator: 'red'
        });
    }

    frm.refresh_field('cutting_plan_plate_details');
}

function set_plate_number_options(frm) {

    let options = (frm.doc.cutting_plan_plate_details || [])
        .map(row => row.plate_number)
        .filter(p => p);

    // remove duplicates
    options = [...new Set(options)];

    frm.fields_dict["cutting_plan_item"]
        .grid.update_docfield_property(
            "plate_number",
            "options",
            options.join("\n")
        );
}

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


function show_pdf_preview(frm) {
    if (frm.doc.cutting_diagram) {
        let file_url = frm.doc.cutting_diagram;
        frm.fields_dict.diagram_preview.$wrapper.html(`
            <iframe src="${file_url}#zoom=100" 
                width="100%" height="600px"
                style="border:1px solid #ccc; border-radius:8px;">
            </iframe>
        `);
    } else {
        frm.fields_dict.diagram_preview.$wrapper.html(`<p>No File uploaded</p>`);
    }
}