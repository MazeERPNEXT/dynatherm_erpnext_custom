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

// -------------------- Estimate Form --------------------
frappe.ui.form.on("Estimate", {
	refresh(frm) {

    //    if (frm.fields_dict["estimated_consumable"]) {
    //         frm.fields_dict["estimated_consumable"].grid.get_field("item_code").get_query =
    //             function (doc, cdt, cdn) {
    //                 return {
    //                     filters: { item_group: "Consumable" }
    //                 };
    //             };
    //     }

        frm.set_query("item_code", "estimated_consumable", function() {
            return {
                filters: {
                    item_group: "Consumable"
                }
            };
        });
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

					row.raw_material_type = bi.raw_material_type || "";
					row.outer_diameter = bi.custom_outer_diameter || 0;
					row.inner_diameter = bi.custom_inner_diameter || 0;
					row.wall_thickness = bi.custom_wall_thickness || 0;
					row.base_weight = bi.custom_base_weight || 0;

					exist.add(bi.item_code);
					added++;
				}

				processItem(0);
			}
		});
	},


	// (2) Button → get_subassembly_items
	get_subassembly_items(frm) {
		if (!frm.doc.estimated_bom_materials || frm.doc.estimated_bom_materials.length === 0) {
			return frappe.msgprint(__("No Estimated BOM Materials found. Please get BOM materials first."));
		}

			// 🧹 Clear old output every time user clicks button
		frm.clear_table("estimated_sub_assembly_items");
		frm.refresh_field("estimated_sub_assembly_items");

		// --- New logic: Pick selected BOMs, else pick all ---
		let selected = frm.doc.estimated_bom_materials.filter(d => d.pick_parts == 1 && d.bom_no);
		let bom_list = (selected.length > 0 ? selected : frm.doc.estimated_bom_materials)
			.map(d => d.bom_no)
			.filter(b => b && b.trim() !== "");

		if (bom_list.length === 0) {
			return frappe.msgprint(__("No valid BOM numbers found in Estimated BOM Materials."));
		}

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
					row.item_code = bi.item_code;
					row.item_group = bi.custom_item_group;
					row.item_name = bi.item_name || bi.description || "";

					// ✅ Ensure bom_no comes from the current BOM we are processing
					row.bom_no =
						(bi.bom_no && bi.bom_no.toString().trim()) ||
						current_bom ||
						(bi.item_code && /^BOM[-\/]/i.test(bi.item_code) ? bi.item_code : "") ||
						"";

					// Common material fields
					row.length = bi.custom_length || bi.length || 0;
					row.width = bi.custom_width || bi.width || 0;
					row.thickness = bi.custom_thickness || bi.thickness || 0;
					row.density = bi.custom_density || bi.density || 0;
					row.kilogramskgs = bi.custom_kilogramskgs || 0;

					row.raw_material_type = bi.raw_material_type || "";
					row.outer_diameter = bi.custom_outer_diameter || bi.outer_diameter || 0;
					row.inner_diameter = bi.custom_inner_diameter || bi.inner_diameter || 0;
					row.wall_thickness = bi.custom_wall_thickness || bi.wall_thickness || 0;
					row.base_weight = bi.custom_base_weight || bi.base_weight || 0;

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


	// // Quotation button logic (unchanged)
	// refresh(frm) {
	// 	if (frm.doc.docstatus === 1) {
	// 		cur_frm.page.set_inner_btn_group_as_primary(__("Create"));
	// 		frm.add_custom_button(__('Quotation'), () => {
	// 			frappe.call({
	// 				method: "frappe.client.get_list",
	// 				args: {
	// 					doctype: "Quotation",
	// 					filters: { custom_crfq__tender_id: frm.doc.crfq__tender_id },
	// 					fields: ["name"], limit: 1
	// 				},
	// 				callback: (r) => {
	// 					if (r.message && r.message.length) {
	// 						frappe.msgprint(__("Quotation already exists."));
	// 						return frappe.set_route("Form", "Quotation", r.message[0].name);
	// 					}
	// 					frappe.route_options = {
	// 						valid_till: frm.doc.valid_till,
	// 						total: frm.doc.total,
	// 						party_name: frm.doc.customer_name,
	// 						custom_crfq__tender_id: frm.doc.crfq__tender_id || "",
	// 					};
	// 					const items = (frm.doc.items || [])
	// 						.filter(i => i.item_code)
	// 						.map(i => ({
	// 							item_code: i.item_code,
	// 							item_name: i.item_name,
	// 							qty: i.qty,
	// 							uom: i.uom,
	// 							rate: i.rate,
	// 							amount: i.amount
	// 						}));
	// 					if (!items.length) return frappe.msgprint(__("No valid items."));
	// 					localStorage.setItem("estimate_items_temp", JSON.stringify(items));
	// 					frappe.set_route("Form", "Quotation", "new-quotation");
	// 				}
	// 			});
	// 		}, __('Create'));
	// 	}
	// },
});


// =============================================================
//  Estimate Item - CHILD TABLE SCRIPT
// =============================================================
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


// =============================================================
//  NEW FUNCTION → SUM transport_cost → UPDATE transport_fg_costs
// =============================================================
function compute_transport_fg_total(frm) {
    const rows = frm.doc.items || [];
    let total = 0;

    rows.forEach(r => {
        total += flt(r.transport_cost);
    });

    frm.set_value("transport_fg_costs", total.toFixed(2));
}


// =============================================================
// Helper: safe number parser
// =============================================================
function safeNumber(v) {
    return isNaN(parseFloat(v)) ? 0 : parseFloat(v);
}


// ---------------------------------------------------------
// Estimated BOM Materials - Child Table Events
// ---------------------------------------------------------
frappe.ui.form.on("Estimated BOM Materials", {

    item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        frappe.db.get_value("Item", row.item_code, ["item_name", "item_group"])
            .then(r => {
                if (r && r.message) {
                    row.item_name = r.message.item_name || row.item_name;
                    row.item_group = r.message.item_group || row.item_group;
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
        compute_bom_amount(frm, cdt, cdn);
        compute_transport_sfg_total(frm);
    },

    margin: function(frm, cdt, cdn) {
        compute_bom_amount(frm, cdt, cdn);
        compute_transport_sfg_total(frm);
    },

    // Trigger when user edits transport_cost manually
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
        row.uom = "Kg";
        row.margin = 0;
        row.amount = 0;
        frm.refresh_field("estimated_bom_materials");
    },
});


// ---------------------------------------------------------
// WEIGHT CALCULATION (All Item Groups)
// ---------------------------------------------------------
function calculate_estimate_weight(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const type = row.item_group;
    const π = Math.PI;

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
    row.qty = flt(base, 3);
    row.kilogramskgs = flt(row.qty);
    row.uom = "Kg";

    compute_bom_amount(frm, cdt, cdn);
    frm.refresh_field("estimated_bom_materials");
    compute_transport_sfg_total(frm);
}

// ---------------------------------------------------------
// AMOUNT CALCULATION
// ---------------------------------------------------------
function compute_bom_amount(frm, cdt, cdn) {
    const r = locals[cdt][cdn];

    const base = flt(r.qty) * flt(r.rate);
    const marginAmt = base * (flt(r.margin) / 100);

    r.amount = flt(base + marginAmt, 2);

    frm.refresh_field("estimated_bom_materials");
    recompute_total(frm);
}


// ---------------------------------------------------------
// NEW FUNCTION: Total of transport_cost (Child → Parent)
// ---------------------------------------------------------
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

        // ------------------------------
        // 1 Get Item Name + Item Group
        // ------------------------------
        let item = await frappe.db.get_value("Item", row.item_code, ["item_name", "item_group"]);
        if (item && item.message) {
            frappe.model.set_value(cdt, cdn, "item_name", item.message.item_name);
            frappe.model.set_value(cdt, cdn, "item_group", item.message.item_group);
        }

        // ------------------------------
        // 2 Get Item Price → price_list_rate
        // ------------------------------
        let price = await frappe.db.get_list("Item Price", {
            filters: { item_code: row.item_code },
            fields: ["price_list_rate"],
            limit: 1
        });

        if (price && price.length) {
            frappe.model.set_value(cdt, cdn, "last_purchase_price", price[0].price_list_rate);
        } else {
            frappe.model.set_value(cdt, cdn, "last_purchase_price", 0);
        }

        // ------------------------------
        // 3 Recalculate weight + amount
        // ------------------------------
        calculate_sub_assembly_weight(frm, cdt, cdn);
        calculate_amount_and_total(frm, cdt, cdn);
        calculate_transport_cost_total(frm);

        frm.refresh_field("estimated_sub_assembly_items");
    },


    qty(frm, cdt, cdn) {
        calculate_sub_assembly_weight(frm, cdt, cdn);
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

    // Transport Cost direct change
    transport_cost(frm, cdt, cdn) {
        calculate_transport_cost_total(frm);
    },

    // Dimension triggers
    length: calculate_sub_assembly_weight,
    width: calculate_sub_assembly_weight,
    thickness: calculate_sub_assembly_weight,
    density: calculate_sub_assembly_weight,
    outer_diameter: calculate_sub_assembly_weight,
    inner_diameter: calculate_sub_assembly_weight,
    wall_thickness: calculate_sub_assembly_weight,

});


// ---------------------------------------------------------
// Get Child Table Fieldname
// ---------------------------------------------------------
function get_sub_assembly_child_table(frm) {
    let field = frm.meta.fields.find(
        f => f.fieldtype === "Table" && f.options === "Estimated Sub Assembly Items"
    );
    return field ? field.fieldname : null;
}


// ---------------------------------------------------------
// Amount Calculation (qty * rate + margin)
// ---------------------------------------------------------
function calculate_amount_and_total(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

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

    frappe.model.set_value(cdt, cdn, "amount", amount.toFixed(2));

    setTimeout(() => {
        update_total_sub_assembly(frm);
    }, 50);
}


// ---------------------------------------------------------
// Total Amount of Sub Assembly
// ---------------------------------------------------------
function update_total_sub_assembly(frm) {
    let child = get_sub_assembly_child_table(frm);
    if (!child) return;

    let total = 0;
    (frm.doc[child] || []).forEach(r => {
        total += flt(r.amount);
    });

    frm.set_value("total_sub_assembly", total.toFixed(2));
}


// ---------------------------------------------------------
// NEW FUNCTION: Calculate Total Transport Cost
// ---------------------------------------------------------
function calculate_transport_cost_total(frm) {
    let child = get_sub_assembly_child_table(frm);
    if (!child) return;

    let total_transport = 0;

    (frm.doc[child] || []).forEach(r => {
        total_transport += flt(r.transport_cost);
    });

    // Update parent field: transport_rm_costs
    frm.set_value("transport_rm_costs", total_transport.toFixed(2));
}

// ---------------------------------------------------------
// Weight Calculation (Multi Item Group Logic)
// ---------------------------------------------------------
function calculate_sub_assembly_weight(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const type = row.item_group;
    const π = Math.PI;

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

    // Update fields
    row.base_weight = flt(base, 4);
    row.qty = flt(base, 3);
    row.kilogramskgs = flt(row.qty);
    row.uom = "Kg";

    frm.refresh_field("estimated_sub_assembly_items");
}



// -------------------- Estimated Operation --------------------
frappe.ui.form.on('Estimated Operation', {
    estimate_qty: function(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
    },
    estimate_rate: function(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
    },
    estimate_margin: function(frm, cdt, cdn) {
        apply_margin(frm, cdt, cdn);
    }
});

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
        setTimeout(() => update_transport_consumable_total(frm), 50);
    },

    item_code(frm, cdt, cdn) {
        setTimeout(() => {
            calculate_consumable_amount(frm, cdt, cdn);
            update_transport_consumable_total(frm);
        }, 50);
    },

    estimated_consumable_add(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (row) {
            if (!row.qty) frappe.model.set_value(cdt, cdn, "qty", 1);
            if (!row.margin) frappe.model.set_value(cdt, cdn, "margin", 0);
            if (!row.amount) frappe.model.set_value(cdt, cdn, "amount", 0);
        }
        setTimeout(() => update_transport_consumable_total(frm), 100);
    },

    estimated_consumable_remove(frm) {
        // when user deletes a row
        setTimeout(() => update_transport_consumable_total(frm), 100);
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
        if (margin) amount = amount + (amount * (margin / 100));
    }

    frappe.model.set_value(cdt, cdn, "amount", Number(amount.toFixed(2)), () => {
        setTimeout(() => update_transport_consumable_total(frm), 50);
    });
}


// -------------------- Parent Total of transport_cost --------------------
function update_transport_consumable_total(frm) {
    const child_field = (frm.meta.fields.find(f => f.fieldtype === "Table" && f.options === "Estimated Consumable") || {}).fieldname || "estimated_consumable";

    let total = 0;
    (frm.doc[child_field] || []).forEach(r => {
        total += safeNumber(r.transport_cost);
    });

    frappe.model.set_value(frm.doc.doctype, frm.doc.name, "transport_consumable_costs", Number(total.toFixed(2)), () => {
        try { frm.refresh_field("transport_consumable_costs"); } catch (e) {}
    });
}


