// erp_custom/doctype/estimate/estimate.js
// Combined working version — handles both:
//   (1) get_items_from_bom → Estimated BOM Materials
//   (2) get_subassembly_items → Estimated Sub Assembly Items

// -------------------- ERPNext Controller Setup --------------------
if (typeof erpnext !== "undefined" && erpnext) {
	try {
		erpnext.accounts.taxes.setup_tax_validations("Sales Taxes and Charges Template");
		erpnext.accounts.taxes.setup_tax_filters("Sales Taxes and Charges");
	} catch (e) {
		console.warn("erpnext integrations skipped:", e);
	}
}

// -------------------- Helper Functions --------------------
function safeNumber(v) {
	if (v === null || v === undefined || v === "") return 0;
	if (typeof v === "string") v = v.replace(/,/g, "");
	const n = Number(v);
	return isNaN(n) ? 0 : n;
}

// -------------------- Totals --------------------
function recompute_total(frm) {
	let bom_total = 0.0;
	if (frm.doc.estimated_bom_materials) {
		frm.doc.estimated_bom_materials.forEach(r => bom_total += safeNumber(r.amount));
	}
	const total = Number(bom_total.toFixed(2));
	if (frm.doc.total !== total) frm.set_value("total", total);
	update_first_item_rate_only(frm, total);
}

// -------------------- Sync BOM Total to First Item Rate Only (fixed with callbacks) --------------------
function update_first_item_rate_only(frm, total) {
	if (!frm.doc.items || !frm.doc.items.length) return;

	const first = frm.doc.items[0];
	const cdt = first.doctype || "Estimate Item";
	const cdn = first.name;

	const qty = safeNumber(first.qty) || 1;
	const computed_rate = Number((total / qty).toFixed(2));

	const current_rate = safeNumber(first.rate);
	// Only update when current rate is less than computed_rate (preserve higher manually-set rates)
	if (current_rate < computed_rate) {
		// Use callbacks to ensure dependent values refresh and totals are re-calculated
		frappe.model.set_value(cdt, cdn, "rate", computed_rate, () => {
			const updated_row = locals[cdt] && locals[cdt][cdn];
			const updated_qty = safeNumber(updated_row && updated_row.qty) || qty;
			const updated_amount = Number((updated_qty * safeNumber(computed_rate)).toFixed(2));

			frappe.model.set_value(cdt, cdn, "amount", updated_amount, () => {
				// Refresh UI and recalc totals safely
				try { frm.refresh_field("items"); } catch (e) {}
				recompute_total(frm);
			});
		});
	}
}

// -------------------- Recursive BOM Fetch --------------------
function fetch_bom_recursive(bom_name, opts, cb) {
	opts = opts || {};
	const visited = opts.visited || new Set();
	if (visited.has(bom_name)) return cb(null, []);
	visited.add(bom_name);

	frappe.call({
		method: "frappe.client.get",
		args: { doctype: "BOM", name: bom_name },
		callback: function (r) {
			if (!r.message) return cb("BOM not found: " + bom_name);
			const bom = r.message, items = bom.items || [];
			let result = [];

			let i = 0;
			function next() {
				if (i >= items.length) return cb(null, result);
				const bi = items[i++];
				const looksLikeBOM = !!bi.bom_no || /^BOM[-\/]/i.test(bi.item_code || "");
				if (looksLikeBOM) {
					const sub = bi.bom_no || bi.item_code;
					if (visited.has(sub)) return next();
					fetch_bom_recursive(sub, { visited: visited }, (err, inner) => {
						if (err) result.push(bi);
						else result = result.concat(inner);
						next();
					});
				} else {
					result.push(bi);
					next();
				}
			}
			next();
		}
	});
}

// ----------------------------------------------------
// -------------------- Estimate Form --------------------
// ----------------------------------------------------
frappe.ui.form.on("Estimate", {
	 refresh(frm) {

        // Show button only when Estimate is submitted
        if (frm.doc.docstatus !== 1 || !frm.doc.crfq__tender_id) return;

        frm.add_custom_button("Create Quotation", () => {

            // STEP 1: Check if quotation already exists for same Tender ID
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Quotation",
                    filters: {
                        custom_crfq__tender_id: frm.doc.crfq__tender_id,
                        docstatus: 1
                    },
                    fields: ["name"],
                    limit_page_length: 1
                },
                callback: function (r) {

                    // STEP 2: If quotation already exists → OPEN IT
                    if (r.message && r.message.length > 0) {
                        frappe.set_route("Form", "Quotation", r.message[0].name);
                        return;
                    }

                    // STEP 3: Else → CREATE NEW QUOTATION
                    frappe.model.with_doctype("Quotation", () => {

                        let quotation = frappe.model.get_new_doc("Quotation");

                        // -------- Header Mapping --------
                        quotation.custom_crfq__tender_id = frm.doc.crfq__tender_id;
                        quotation.party_name = frm.doc.customer_name || "";
                        quotation.quotation_to = "Customer";

                        // -------- Child Table Mapping --------
                        (frm.doc.items || []).forEach(item => {

                            let child = frappe.model.add_child(
                                quotation,
                                "Quotation Item",
                                "items"
                            );

                            child.item_code = item.item_code;
                            child.item_name = item.item_name;
                            child.item_group = item.item_group;

                            child.stock_uom = item.uom;
                            child.uom = item.uom;
                            child.qty = item.qty;
                            child.rate = item.rate;
                            child.amount = item.amount;

                            child.custom_bom_no = frm.doc.bom || "";
                            child.estimate_rate = item.rate;
                        });

                        // Prevent auto-fetch overriding values
                        quotation.__run_link_triggers = true;

                        // Redirect to new quotation
                        frappe.set_route("Form", "Quotation", quotation.name);
                    });
                }
            });

        }).addClass("btn-primary");

        // ---------------------------
        // CONSUMABLE ITEM FILTER LOGIC
        // ---------------------------

        const child_fieldname = "estimated_consumable";
        const grid = frm.fields_dict[child_fieldname]?.grid;
        if (!grid) return;

        // Filter using set_query
        frm.set_query("item_code", child_fieldname, function () {
            return {
                filters: {
                    item_group: "Consumable"
                }
            };
        });

        // Strong filter directly on grid field
        setTimeout(() => {
            const item_field = grid.get_field("item_code");
            if (item_field) {
                item_field.get_query = function () {
                    return {
                        filters: {
                            item_group: "Consumable"
                        }
                    };
                };
            }
        }, 0);
    },
    
	// Auto default BOM from Finished Goods
	finished_goods(frm) {
		if (!frm.doc.finished_goods) return;
		frappe.db.get_value("Item", frm.doc.finished_goods, "default_bom", (r) => {
			if (r && r.default_bom) frm.set_value("bom", r.default_bom);
			else frappe.msgprint(__("No Default BOM found for this Finished Goods item."));
		});
	},

	// (1) Button → get_items_from_bom
	get_items_from_bom(frm) {
		if (!frm.doc.bom) return frappe.msgprint(__("Please select a BOM first."));

		frappe.call({
			method: "frappe.client.get",
			args: { doctype: "BOM", name: frm.doc.bom },
			callback(r) {
				if (!r.message) return frappe.msgprint(__("BOM not found."));
				const bom = r.message;
				if (!bom.items || !bom.items.length) return frappe.msgprint(__("No items in BOM."));

				const exist = new Set((frm.doc.estimated_bom_materials || []).map(i => i.item_code));
				let added = 0;

				// Process each BOM item
				const processItem = (idx) => {
					if (idx >= bom.items.length) {
						frm.refresh_field("estimated_bom_materials");
						frappe.msgprint(__(`${added} item(s) added from BOM.`));
						// After adding rows, you may want to fetch rates and compute amounts externally if needed
						return;
					}

					const bi = bom.items[idx];

					if (exist.has(bi.item_code)) {
						return processItem(idx + 1);
					}

					// If bom_no is empty, fetch from Item’s default_bom
					if (!bi.bom_no) {
						frappe.db.get_value("Item", bi.item_code, "default_bom").then(res => {
							let default_bom = (res && res.message && res.message.default_bom) || "";
							addBOMRow(bi, default_bom);
							processItem(idx + 1);
						});
					} else {
						addBOMRow(bi, bi.bom_no);
						processItem(idx + 1);
					}
				};

				// Helper function to add child row
				function addBOMRow(bi, bom_no) {
					let row = frm.add_child("estimated_bom_materials");
					row.item_code = bi.item_code;
					row.item_name = bi.item_name;
					row.item_group = bi.custom_item_group;
					row.qty = bi.qty || 1;
					row.uom = bi.uom || "Nos";
					row.bom_no = bom_no || "";

					row.length = bi.custom_length || 0;
					row.width = bi.custom_width || 0;
					row.thickness = bi.custom_thickness || 0;
					row.density = bi.custom_density || 0;
					row.kilogramskgs = bi.custom_kilogramskgs || 0;

					row.material_type = bi.custom_material_type || "";
					row.outer_diameter = bi.custom_outer_diameter || 0;
					row.inner_diameter = bi.custom_inner_diameter || 0;
					row.wall_thickness = bi.custom_wall_thickness || 0;
					row.base_weight = bi.custom_base_weight || 0;
                    row.total_weight = bi.custom_total_weight || 0;

					exist.add(bi.item_code);
					added++;
				}

				processItem(0);
			}
		});
	},


	// (2) Button → get_subassembly_items
	get_subassembly_items(frm) {

        // 🔗 Build BOM → Parent Item map
        let bom_parent_map = {};
        (frm.doc.estimated_bom_materials || []).forEach(row => {
            if (row.bom_no && row.item_code) {
                bom_parent_map[row.bom_no] = row.item_code;
            }
        });

		if (!frm.doc.estimated_bom_materials || frm.doc.estimated_bom_materials.length === 0) {
			return frappe.msgprint(__("No Estimated BOM Materials found. Please get BOM materials first."));
		}

			// 🧹 Clear old output every time user clicks button
		frm.clear_table("estimated_sub_assembly_items");
		frm.refresh_field("estimated_sub_assembly_items");

		// --- New logic: Pick selected BOMs, else pick all ---
		// let selected = frm.doc.estimated_bom_materials.filter(d => d.pick_parts == 1 && d.bom_no);
		// let bom_list = (selected.length > 0 ? selected : frm.doc.estimated_bom_materials)
		// 	.map(d => d.bom_no)
		// 	.filter(b => b && b.trim() !== "");

		// if (bom_list.length === 0) {
		// 	return frappe.msgprint(__("No valid BOM numbers found in Estimated BOM Materials."));
		// }

        // --- New logic: Pick selected BOMs, else pick all ---
        // --- EXCLUDE item_source = "Buy" ---
        let selected = frm.doc.estimated_bom_materials.filter(d =>
            d.pick_parts == 1 &&
            d.bom_no &&
            d.item_source !== "Buy"
        );

        let bom_list = (selected.length > 0 ? selected : frm.doc.estimated_bom_materials)
            .filter(d => d.bom_no && d.item_source !== "Buy") // 🔥 CORE FILTER
            .map(d => d.bom_no)
            .filter(b => b && b.trim() !== "");


		let exist = new Set((frm.doc.estimated_sub_assembly_items || []).map(i => i.item_code));
		let added = 0;
		let total_boms = bom_list.length;
		let processed = 0;

		// Recursive fetch for each BOM in sequence
		function process_next_bom() {
			if (processed >= total_boms) {
				frm.refresh_field("estimated_sub_assembly_items");
				return frappe.msgprint(__(`${added} Sub-Assembly item(s) added.`));
			}

			let current_bom = bom_list[processed++];
			fetch_bom_recursive(current_bom, { max_depth: 6 }, (err, items) => {
				if (err) {
					frappe.msgprint(__(`Error while fetching ${current_bom}: ${err}`));
					return process_next_bom();
				}

				if (!items.length) {
					frappe.msgprint(__(`No Sub-Assembly items found for ${current_bom}.`));
					return process_next_bom();
				}

				items.forEach(bi => {
					if (exist.has(bi.item_code)) return;

                    let row = frm.add_child("estimated_sub_assembly_items");

                    // Child item (actual sub-assembly)
                    row.item_code = bi.item_code;
                    row.item_name = bi.item_name || bi.description || "";
                    row.item_group = bi.custom_item_group;

                    // ✅ Parent Assembly Item (from Estimated BOM Materials)
                    row.sub_assembly_item = bom_parent_map[current_bom] || bi.parent_item || "";

                    // BOM reference
                    row.bom_no = String(bi.bom_no || "").trim() || current_bom || "";

					// Common material fields
					row.length = bi.custom_length || bi.length || 0;
					row.width = bi.custom_width || bi.width || 0;
					row.thickness = bi.custom_thickness || bi.thickness || 0;
					row.density = bi.custom_density || bi.density || 0;
					row.kilogramskgs = bi.custom_kilogramskgs || 0;

					row.material_type = bi.custom_material_type || "";
					row.outer_diameter = bi.custom_outer_diameter || bi.outer_diameter || 0;
					row.inner_diameter = bi.custom_inner_diameter || bi.inner_diameter || 0;
					row.wall_thickness = bi.custom_wall_thickness || bi.wall_thickness || 0;
					row.base_weight = bi.custom_base_weight || bi.base_weight || 0;
                    row.total_weight = bi.custom_total_weight || bi.total_weight || 0;
                    row.last_purchase_price = bi.custom_last_purchase_price || bi.last_purchase_price || 0;

					row.qty = safeNumber(bi.qty) || 1;
					row.uom = bi.uom || "Nos";

					exist.add(bi.item_code);
					added++;
				});

				process_next_bom();
			});
		}

		process_next_bom();
	},
});


// -------------------------------------------------
//  Estimate Item - CHILD TABLE 
// -------------------------------------------------
frappe.ui.form.on("Estimate Item", {
    item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row || !row.item_code) return;

        frappe.db.get_value("Item", row.item_code, ["item_name", "item_group"])
            .then(res => {
                if (res && res.message) {
                    try {
                        frappe.model.set_value(cdt, cdn, "item_name", res.message.item_name || "");
                        if ("item_group" in row) {
                            frappe.model.set_value(cdt, cdn, "item_group", res.message.item_group || "");
                        }
                    } catch (e) {
                        row.item_name = res.message.item_name || row.item_name;
                        if ("item_group" in row) row.item_group = res.message.item_group || row.item_group;
                        frm.refresh_field("items");
                    }
                }
                compute_transport_fg_total(frm);
            });
    },

    rate(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row) return;

        const qty = safeNumber(row.qty) || 1;
        const entered_rate = safeNumber(row.rate);
        const parent_total = safeNumber(frm.doc.total);
        const min_rate = Number((parent_total / qty).toFixed(2));

        // Check if row is the first item in table
        const is_first = frm.doc.items && frm.doc.items.length > 0 &&
                         frm.doc.items[0] && frm.doc.items[0].name === cdn;

        if (is_first && entered_rate < min_rate) {
            frappe.msgprint({
                title: __("Invalid Rate"),
                message: __(
                    "Entered rate ({0}) is less than the minimum allowed rate ({1}). Reverting to minimum rate.",
                    [entered_rate.toFixed(2), min_rate.toFixed(2)]
                ),
                indicator: "red",
            });

            frappe.model.set_value(cdt, cdn, "rate", min_rate, () => {
                const updated_amount = Number((qty * safeNumber(min_rate)).toFixed(2));
                frappe.model.set_value(cdt, cdn, "amount", updated_amount, () => {
                    try { frm.refresh_field("items"); } catch (e) {}
                    recompute_total(frm);
                    compute_transport_fg_total(frm);
                });
            });
            return;
        }

        // Normal case
        const amount = Number((qty * entered_rate).toFixed(2));
        frappe.model.set_value(cdt, cdn, "amount", amount, () => {
            recompute_total(frm);
            compute_transport_fg_total(frm);
        });
    },

    qty(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        const qty = safeNumber(row.qty) || 1;
        const rate = safeNumber(row.rate) || 0;
        const amount = Number((qty * rate).toFixed(2));

        frappe.model.set_value(cdt, cdn, "amount", amount, () => {
            recompute_total(frm);
            compute_transport_fg_total(frm);
        });
    },

    // Trigger when user enters transport_cost
    transport_cost(frm, cdt, cdn) {
        compute_transport_fg_total(frm);
    },

    // If row removed → refresh total
    items_remove(frm) {
        compute_transport_fg_total(frm);
    }
});


// ---------------------------------- NEW FUNCTION → SUM transport_cost → UPDATE transport_fg_costs  ----------------------------------
function compute_transport_fg_total(frm) {
    const rows = frm.doc.items || [];
    let total = 0;

    rows.forEach(r => {
        total += flt(r.transport_cost);
    });

    frm.set_value("transport_fg_costs", total.toFixed(2));
}

// ---------------------------------- Helper: safe number parser ----------------------------------
function safeNumber(v) {
    return isNaN(parseFloat(v)) ? 0 : parseFloat(v);
}

// ---------------------------------------------------------
// Estimated BOM Materials - Child Table Events
// ---------------------------------------------------------
frappe.ui.form.on("Estimated BOM Materials", {
    item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.item_code) return;

        frappe.db.get_value(
            "Item",
            row.item_code,
            [
                "item_name",
                "item_group",
                "custom_material_type",
                "custom_density",
                "default_bom"   // ✅ FETCH DEFAULT BOM
            ]
        ).then(r => {
            if (r && r.message) {
                const data = r.message;

                row.item_name = data.item_name || row.item_name;
                row.item_group = data.item_group || row.item_group;

                // material logic
                row.material_type = data.custom_material_type || row.material_type;
                row.density = flt(data.custom_density) || row.density;

                // ✅ AUTO SET BOM
                if (data.default_bom) {
                    row.bom_no = data.default_bom;
                } else {
                    row.bom_no = null;
                }
            }

            calculate_estimate_weight(frm, cdt, cdn);
            frm.refresh_field("estimated_bom_materials");
            compute_transport_sfg_total(frm);
        });
    },

    rate: function(frm, cdt, cdn) {
        compute_bom_amount(frm, cdt, cdn);
        compute_transport_sfg_total(frm);
    },

    qty: function(frm, cdt, cdn) {
        calculate_total_weight(frm, cdt, cdn);   // ✅ ADDED
        compute_bom_amount(frm, cdt, cdn);
        compute_transport_sfg_total(frm);
    },

    margin: function(frm, cdt, cdn) {
        compute_bom_amount(frm, cdt, cdn);
        compute_transport_sfg_total(frm);
    },

    transport_cost: function(frm, cdt, cdn) {
        compute_transport_sfg_total(frm);
    },

    // Dimensions
    length: calculate_estimate_weight,
    width: calculate_estimate_weight,
    thickness: calculate_estimate_weight,
    outer_diameter: calculate_estimate_weight,
    inner_diameter: calculate_estimate_weight,
    wall_thickness: calculate_estimate_weight,
    density: calculate_estimate_weight,

    estimated_bom_materials_add(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        row.margin = 0;
        row.amount = 0;
        frm.refresh_field("estimated_bom_materials");
    },
});



// -------------------------- WEIGHT CALCULATION (All Item Groups)------------------------------------
function calculate_estimate_weight(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const type = row.item_group;
    const π = Math.PI;

    const manual_groups = ["Fasters", "Gaskets"];

    if (manual_groups.includes(type)) {

        row.base_weight = 0;
        row.kilogramskgs = flt(row.qty);
        row.uom = "Nos";

        calculate_total_weight(frm, cdt, cdn); // ✅ ADDED
        return;
    }

    let base = 0;

    // ---- Plates ----
    if (type === "Plates") {
        if (row.length && row.width && row.thickness && row.density) {
            base = (row.length * row.width * row.thickness * row.density) / 1_000_000;
        }
    }
    // ---- Tubes / Pipes ----
    else if (["Tubes", "Pipes"].includes(type)) {
        if (row.length && row.outer_diameter && row.wall_thickness && row.density) {
            const R = row.outer_diameter / 2;
            const r = R - row.wall_thickness;
            base = (π * (R ** 2 - r ** 2) * row.length * row.density) / 1_000_000;
        }
    }
    // ---- Flanges / Rings ----
    else if (["Flanges", "Rings"].includes(type)) {
        if (row.outer_diameter && row.inner_diameter && row.thickness && row.density) {
            const R = row.outer_diameter / 2;
            const r = row.inner_diameter / 2;
            base = (π * (R ** 2 - r ** 2) * row.thickness * row.density) / 1_000_000;
        }
    }
    // ---- Rods ----
    else if (type === "Rods") {
        if (row.length && row.outer_diameter && row.density) {
            const R = row.outer_diameter / 2;
            base = (π * R ** 2 * row.length * row.density) / 1_000_000;
        }
    }
    // ---- Forgings ----
    else if (type === "Forgings") {
        if (row.length && row.outer_diameter && row.wall_thickness && row.density) {
            const R = row.outer_diameter / 2;
            const r = Math.max(R - row.wall_thickness, 0);
            base = (π * (R ** 2 - r ** 2) * row.length * row.density) / 1_000_000;
        }
    }

    // ---- Update weight fields ----
    row.base_weight = flt(base, 4);
    row.kilogramskgs = flt(base, 3);
    row.uom = "Kg";

    calculate_total_weight(frm, cdt, cdn); // ✅ ADDED

    compute_bom_amount(frm, cdt, cdn);
    frm.refresh_field("estimated_bom_materials");
    compute_transport_sfg_total(frm);
}


// ---------------------------- TOTAL WEIGHT CALCULATION -------------------------------------------
function calculate_total_weight(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    // ✅ qty * kilogramskgs = total_weight
    row.total_weight = flt(row.qty) * flt(row.kilogramskgs);

    frm.refresh_field("estimated_bom_materials");
}



// ----------------------------AMOUNT CALCULATION-------------------------------------------
function compute_bom_amount(frm, cdt, cdn) {
    const r = locals[cdt][cdn];

    const base = flt(r.qty) * flt(r.rate);
    const marginAmt = base * (flt(r.margin) / 100);

    r.amount = flt(base + marginAmt, 2);

    frm.refresh_field("estimated_bom_materials");
    recompute_total(frm);
}


// ------------------------ Total of transport_cost (Child → Parent) -----------------------------------
function compute_transport_sfg_total(frm) {
    const rows = frm.doc.estimated_bom_materials || [];
    let total = 0;

    rows.forEach(r => {
        total += flt(r.transport_cost);
    });

    frm.set_value("transport_sfg_costs", total.toFixed(2));
}

// ---------------------------------------------------------
// Estimated Sub Assembly Items - Child Table Events 
// ---------------------------------------------------------
frappe.ui.form.on("Estimated Sub Assembly Items", {
    async item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.item_code) return;

        // 1️⃣ Fetch Item details INCLUDING default_bom
        let item = await frappe.db.get_value(
            "Item",
            row.item_code,
            [
                "item_name",
                "item_group",
                "custom_material_type",
                "custom_density",
                "default_bom" // ✅ IMPORTANT
            ]
        );

        if (item && item.message) {
            const data = item.message;

            frappe.model.set_value(cdt, cdn, "item_name", data.item_name);
            frappe.model.set_value(cdt, cdn, "item_group", data.item_group);

            // Custom fields
            frappe.model.set_value(cdt, cdn, "material_type", data.custom_material_type);
            frappe.model.set_value(cdt, cdn, "density", data.custom_density);

            // ✅ AUTO SET BOM
            if (data.default_bom) {
                frappe.model.set_value(cdt, cdn, "bom_no", data.default_bom);
            } else {
                frappe.model.set_value(cdt, cdn, "bom_no", null);
            }
        }

        // 2️⃣ Fetch Item Price
        let price = await frappe.db.get_list("Item Price", {
            filters: { item_code: row.item_code },
            fields: ["price_list_rate"],
            limit: 1
        });

        frappe.model.set_value(
            cdt,
            cdn,
            "last_purchase_price",
            price && price.length ? price[0].price_list_rate : 0
        );

        // 3️⃣ Recalculate
        calculate_sub_assembly_weight(frm, cdt, cdn);
        calculate_amount_and_total(frm, cdt, cdn);
        calculate_transport_cost_total(frm);

        frm.refresh_field("estimated_sub_assembly_items");
    },

    qty(frm, cdt, cdn) {
        calculate_sub_assembly_weight(frm, cdt, cdn);
        calculate_sub_assembly_total_weight(frm, cdt, cdn); // ✅ ADDED
        calculate_amount_and_total(frm, cdt, cdn);
        calculate_transport_cost_total(frm);
    },

    rate(frm, cdt, cdn) {
        calculate_amount_and_total(frm, cdt, cdn);
        calculate_transport_cost_total(frm);
    },

    margin(frm, cdt, cdn) {
        calculate_amount_and_total(frm, cdt, cdn);
        calculate_transport_cost_total(frm);
    },

    transport_cost(frm, cdt, cdn) {
        calculate_transport_cost_total(frm);
    },

    amount(frm, cdt, cdn) {
        update_total_sub_assembly(frm);
    },

    length: calculate_sub_assembly_weight,
    width: calculate_sub_assembly_weight,
    thickness: calculate_sub_assembly_weight,
    density: calculate_sub_assembly_weight,
    outer_diameter: calculate_sub_assembly_weight,
    inner_diameter: calculate_sub_assembly_weight,
    wall_thickness: calculate_sub_assembly_weight,

    estimated_sub_assembly_items_add(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (row) {
            if (!row.qty) frappe.model.set_value(cdt, cdn, "qty", 1);
            if (!row.margin) frappe.model.set_value(cdt, cdn, "margin", 0);
            if (!row.amount) frappe.model.set_value(cdt, cdn, "amount", 0);
            if (!row.transport_cost) frappe.model.set_value(cdt, cdn, "transport_cost", 0);
        }
        calculate_transport_cost_total(frm);
        update_total_sub_assembly(frm);
    },

    estimated_sub_assembly_items_remove(frm) {
        setTimeout(() => {
            calculate_transport_cost_total(frm);
            update_total_sub_assembly(frm);
        }, 10);
    }
});

// ----------------------- Get Child Table Fieldname ---------------------------
function get_sub_assembly_child_table(frm) {
    let field = frm.meta.fields.find(
        f => f.fieldtype === "Table" && f.options === "Estimated Sub Assembly Items"
    );
    return field ? field.fieldname : null;
}

// --------------------------Amount Calculation (qty * rate + margin)----------------------------------
function calculate_amount_and_total(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (!row) return;

    let qty    = flt(row.qty);
    let rate   = flt(row.rate);
    let margin = flt(row.margin);

    let amount = 0;

    if (qty && rate) {
        amount = qty * rate;
        if (margin) {
            amount += amount * (margin / 100);
        }
    }

    frappe.model.set_value(cdt, cdn, "amount", Number(amount.toFixed(2)), () => {
        update_total_sub_assembly(frm);
        calculate_transport_cost_total(frm);
    });
}

// ------------------------------Total Amount of Sub Assembly-------------------------------------
function update_total_sub_assembly(frm) {
    let child = get_sub_assembly_child_table(frm);
    if (!child) return;

    let total = 0;
    (frm.doc[child] || []).forEach(r => {
        total += flt(r.amount);
    });

    frm.set_value("total_sub_assembly", Number(total.toFixed(2)));
}

// ----------------------------Calculate Total Transport Cost--------------------------------------
function calculate_transport_cost_total(frm) {
    let child = get_sub_assembly_child_table(frm);
    if (!child) return;

    let total_transport = 0;

    (frm.doc[child] || []).forEach(r => {
        total_transport += flt(r.transport_cost);
    });
    frm.set_value("transport_rm_costs", Number(total_transport.toFixed(2)));
}

// -----------------------Weight Calculation (Multi Item Group Logic)-------------------------------
function calculate_sub_assembly_weight(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (!row) return;

    const type = row.item_group;
    const π = Math.PI;

    const manual_groups = ["Fasters", "Gaskets"];

    if (manual_groups.includes(type)) {
        row.base_weight = 0;
        row.kilogramskgs = flt(row.qty);
        row.uom = "Nos";

        calculate_sub_assembly_total_weight(frm, cdt, cdn); 
        frm.refresh_field("estimated_sub_assembly_items");
        return;
    }

    let base = 0;

    // Plates
    if (type === "Plates") {
        if (row.length && row.width && row.thickness && row.density) {
            base = (row.length * row.width * row.thickness * row.density) / 1_000_000;
        }
    }
    // Tubes / Pipes
    else if (["Tubes", "Pipes"].includes(type)) {
        if (row.length && row.outer_diameter && row.wall_thickness && row.density) {
            const R = row.outer_diameter / 2;
            const r = R - row.wall_thickness;
            base = (π * (R**2 - r**2) * row.length * row.density) / 1_000_000;
        }
    }
    // Flanges / Rings
    else if (["Flanges", "Rings"].includes(type)) {
        if (row.outer_diameter && row.inner_diameter && row.thickness && row.density) {
            const R = row.outer_diameter / 2;
            const r = row.inner_diameter / 2;
            base = (π * (R**2 - r**2) * row.thickness * row.density) / 1_000_000;
        }
    }
    // Rods
    else if (type === "Rods") {
        if (row.length && row.outer_diameter && row.density) {
            const R = row.outer_diameter / 2;
            base = (π * R**2 * row.length * row.density) / 1_000_000;
        }
    }
    // Forgings
    else if (type === "Forgings") {
        if (row.length && row.outer_diameter && row.wall_thickness && row.density) {
            const R = row.outer_diameter / 2;
            const r = Math.max(R - row.wall_thickness, 0);
            base = (π * (R**2 - r**2) * row.length * row.density) / 1_000_000;
        }
    }

    row.base_weight = flt(base, 4);
    row.kilogramskgs = flt(base, 3);
    row.uom = "Kg";

    calculate_sub_assembly_total_weight(frm, cdt, cdn);
    frm.refresh_field("estimated_sub_assembly_items");
}

// ---------------------------- TOTAL WEIGHT (qty × kilogramskgs) ----------------------------
function calculate_sub_assembly_total_weight(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (!row) return;

    row.total_weight = flt(row.qty) * flt(row.kilogramskgs);

    frm.refresh_field("estimated_sub_assembly_items");
}

// ------------------------------------------------------------
// -------------------- Estimated Operation --------------------
// ------------------------------------------------------------
frappe.ui.form.on('Estimated Operation', {
    estimate_qty(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
        calculate_total_operation_costs(frm);
    },
    estimate_rate(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
        calculate_total_operation_costs(frm);
    },
    estimate_margin(frm, cdt, cdn) {
        apply_margin(frm, cdt, cdn);
        calculate_total_operation_costs(frm);
    },

    // when row deleted → recalc total
    estimated_operation_remove(frm) {
        calculate_total_operation_costs(frm);
    }
});

// ========== Amount Calculations ==========

function calculate_amount(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let qty = flt(row.estimate_qty);
    let rate = flt(row.estimate_rate);

    let amount = qty * rate;
    frappe.model.set_value(cdt, cdn, 'estimate_amount', amount);
}

function apply_margin(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let qty = flt(row.estimate_qty);
    let rate = flt(row.estimate_rate);
    let margin = flt(row.estimate_margin);

    let base_amount = qty * rate;
    let total_amount = base_amount + (base_amount * (margin / 100.0));

    frappe.model.set_value(cdt, cdn, 'estimate_amount', total_amount);
}

// ========== GRAND TOTAL CALCULATOR ==========

function calculate_total_operation_costs(frm) {
    let total = 0;

    (frm.doc.estimated_operation || []).forEach(row => {
        total += flt(row.estimate_amount);
    });

    frm.set_value("total_operation_costs", total);
    frm.refresh_field("total_operation_costs");
}

// ------------------------------------------------------------
// -------------------- Estimated Consumable --------------------
// ------------------------------------------------------------
if (typeof safeNumber !== "function") {
    function safeNumber(v) {
        if (v === null || v === undefined || v === "") return 0;
        if (typeof v === "string") v = v.replace(/,/g, "");
        const n = Number(v);
        return isNaN(n) ? 0 : n;
    }
}

frappe.ui.form.on("Estimated Consumable", {
    qty(frm, cdt, cdn) {
        calculate_consumable_amount(frm, cdt, cdn);
    },

    rate(frm, cdt, cdn) {
        calculate_consumable_amount(frm, cdt, cdn);
    },

    margin(frm, cdt, cdn) {
        calculate_consumable_amount(frm, cdt, cdn);
    },

    transport_cost(frm, cdt, cdn) {
        update_transport_consumable_total(frm);
    },

    amount(frm, cdt, cdn) {
        update_consumable_amount_total(frm);
    },

    item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.item_code) return;

        frappe.db.get_value("Item", row.item_code, ["item_name", "item_group"])
            .then(r => {
                if (r.message) {
                    frappe.model.set_value(cdt, cdn, "item_name", r.message.item_name);
                    frappe.model.set_value(cdt, cdn, "item_group", r.message.item_group);
                }

                // calculate row amount and update both totals
                calculate_consumable_amount(frm, cdt, cdn);
                update_transport_consumable_total(frm);
            });
    },

    estimated_consumable_add(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (row) {
            if (!row.qty) frappe.model.set_value(cdt, cdn, "qty", 1);
            if (!row.margin) frappe.model.set_value(cdt, cdn, "margin", 0);
            if (!row.amount) frappe.model.set_value(cdt, cdn, "amount", 0);
        }
        // keep transport total sync and amount total sync
        update_transport_consumable_total(frm);
        update_consumable_amount_total(frm);
    },

    estimated_consumable_remove(frm) {
        // small delay ensures row removal has been applied to frm.doc
        setTimeout(() => {
            update_transport_consumable_total(frm);
            update_consumable_amount_total(frm);
        }, 10);
    }
});


// -------------------- Row Amount Calculation --------------------
function calculate_consumable_amount(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (!row) return;

    const qty = safeNumber(row.qty);
    const rate = safeNumber(row.rate);
    const margin = safeNumber(row.margin);

    let amount = 0;
    if (qty > 0 && rate > 0) {
        amount = qty * rate;
        if (margin) amount += (amount * margin / 100);
    }

    frappe.model.set_value(cdt, cdn, "amount", Number(amount.toFixed(2)), () => {
        update_transport_consumable_total(frm);
    });
}


// -------------------- Parent Total: transport_cost --------------------
function update_transport_consumable_total(frm) {
    const child_field = frm.meta.fields.find(f =>
        f.fieldtype === "Table" && f.options === "Estimated Consumable"
    )?.fieldname || "estimated_consumable";

    let total = 0;

    (frm.doc[child_field] || []).forEach(r => {
        total += safeNumber(r.transport_cost);
    });

    frm.set_value("transport_consumable_costs", Number(total.toFixed(2)));
}

// -------------------- Parent Total of all row.amount --------------------
function update_consumable_amount_total(frm) {

    const child_field = frm.meta.fields.find(f =>
        f.fieldtype === "Table" && f.options === "Estimated Consumable"
    )?.fieldname || "estimated_consumable";

    let total_amount = 0;

    (frm.doc[child_field] || []).forEach(r => {
        total_amount += safeNumber(r.amount);
    });

    frm.set_value("total_consumable_costs", Number(total_amount.toFixed(2)));
}
