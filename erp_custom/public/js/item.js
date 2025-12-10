frappe.ui.form.on("Item", {
    onload(frm) {
        set_variant_thickness(frm, false);
    },

    refresh(frm) {
        set_variant_thickness(frm, false);
    },

    validate(frm) {
        calculate_item_kgs(frm);
    },

    custom_material_type(frm) {
        if (!frm.doc.custom_material_type) {
            frm.set_value("custom_density", 0);
            calculate_item_kgs(frm);
            return;
        }

        frappe.db.get_value(
            "Material Type",
            frm.doc.custom_material_type,
            ["material_value"]
        ).then(r => {
            const msg = (r && r.message) ? r.message : {};
            frm.set_value("custom_density", flt(msg.material_value) || 0);
            calculate_item_kgs(frm);
        });
    },

    // ----------------------------------------------------
    // FIELD CHANGE TRIGGERS (MATCHES BOM.js)
    // ----------------------------------------------------
    item_group(frm) { calculate_item_kgs(frm); },
    custom_length(frm) { calculate_item_kgs(frm); },
    custom_width(frm) { calculate_item_kgs(frm); },
    custom_thickness(frm) { calculate_item_kgs(frm); },
    custom_outer_diameter(frm) { calculate_item_kgs(frm); },
    custom_inner_diameter(frm) { calculate_item_kgs(frm); },
    custom_wall_thickness(frm) { calculate_item_kgs(frm); },
    custom_density(frm) { calculate_item_kgs(frm); },

    custom_kilogramskgs(frm) {
    const manual_groups = ["Fasteners", "Gaskets"];

    if (!manual_groups.includes(frm.doc.item_group)) {
        const weight = flt(frm.doc.custom_kilogramskgs) || 0;
        frm.set_value("weight_per_unit", weight);

        // NEW — keep both fields equal
        frm.set_value("custom_base_weight", weight);
    }

    frm.set_value("weight_uom", "Kg");
    }
});


// ====================================================================
// SET THICKNESS FOR VARIANTS
// ====================================================================
function set_variant_thickness(frm, force_update = false) {
    if (!frm.doc.has_variants && frm.doc.variant_of) {
        if (frm.doc.attributes && frm.doc.attributes.length > 0) {
            frm.doc.attributes.forEach(attr => {
                if (attr.attribute === "Thickness") {
                    if (!frm.doc.custom_thickness || force_update) {
                        frm.set_value("custom_thickness", attr.attribute_value);
                    }
                }
            });
        }
    }
}


// ====================================================================
// FINAL WEIGHT CALCULATION (MATCHES BOM.js & MATCHES DEPENDS ON LOGIC)
// ====================================================================
function calculate_item_kgs(frm) {

    const type = frm.doc.item_group;
    const density = flt(frm.doc.custom_density) || 0;

    if (!density) {
        frm.set_value("custom_kilogramskgs", 0);
        frm.set_value("weight_per_unit", 0);
        frm.set_value("weight_uom", "Kg");
        return;
    }

    const π = Math.PI;
    let base_weight = 0;

    // -----------------------------------------------------
    // PLATES
    // Depends: Length, Width, Thickness allowed
    // -----------------------------------------------------
    if (type === "Plates") {
        const L = flt(frm.doc.custom_length);
        const W = flt(frm.doc.custom_width);
        const T = flt(frm.doc.custom_thickness);

        if (L && W && T) {
            base_weight = (L * W * T * density) / 1_000_000;
        }
    }

    // -----------------------------------------------------
    // TUBES / PIPES / RODS / BARS / FORGINGS / FLANGES
    // Uses: OD, WT, ID (for flanges), Thickness (for flanges)
    // -----------------------------------------------------

    // TUBES
    else if (type === "Tubes") {
        compute_hollow_cylinder(frm, (wt) => base_weight = wt);
    }

    // PIPES
    else if (type === "Pipes") {
        compute_hollow_cylinder(frm, (wt) => base_weight = wt);
    }

    // FORGINGS
    else if (type === "Forgings") {
        compute_hollow_cylinder(frm, (wt) => base_weight = wt);
    }

    // FLANGES
    else if (type === "Flanges", "Rings") {
        const OD = flt(frm.doc.custom_outer_diameter);
        const ID = flt(frm.doc.custom_inner_diameter);
        const T = flt(frm.doc.custom_thickness);

        if (OD && ID && T) {
            const R = OD / 2;
            const r = ID / 2;
            base_weight = (π * (R**2 - r**2) * T * density) / 1_000_000;
        }
    }

    // RODS / BARS (Solid Cylinder)
    else if (["Rods", "Bars"].includes(type)) {
        const L = flt(frm.doc.custom_length);
        const D = flt(frm.doc.custom_outer_diameter);

        if (L && D) {
            const R = D / 2;
            base_weight = (π * R**2 * L * density) / 1_000_000;
        }
    }

    // -----------------------------------------------------
    // SET VALUES BACK
    // -----------------------------------------------------
    const final_weight = flt(base_weight, 4);

    frm.set_value("custom_kilogramskgs", final_weight);
    frm.set_value("weight_per_unit", final_weight);
    frm.set_value("custom_base_weight", final_weight); 
    frm.set_value("weight_uom", "Kg");
}


// ====================================================================
// REUSABLE HOLLOW CYLINDER (Matches Tubes, Pipes, Forgings)
// ====================================================================
function compute_hollow_cylinder(frm, callback) {
    const density = flt(frm.doc.custom_density);
    const π = Math.PI;

    const L = flt(frm.doc.custom_length);
    const OD = flt(frm.doc.custom_outer_diameter);
    const WT = flt(frm.doc.custom_wall_thickness);

    if (L && OD && WT) {
        const R = OD / 2;
        const r = Math.max(R - WT, 0);

        const weight = (π * (R**2 - r**2) * L * density) / 1_000_000;
        callback(weight);
    }
}
