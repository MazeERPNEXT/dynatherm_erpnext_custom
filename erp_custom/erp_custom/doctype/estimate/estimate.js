// // erp_custom/doctype/estimate/estimate.js
// // Copyright (c) 2015,
// // Frappe Technologies Pvt. Ltd.
// // License: GNU General Public License v3. See license.txt


// // -------------------- ERPNext Controller Setup --------------------
// if (typeof erpnext !== "undefined" && erpnext) {
// 	try {
// 		erpnext.accounts.taxes.setup_tax_validations("Sales Taxes and Charges Template");
// 		erpnext.accounts.taxes.setup_tax_filters("Sales Taxes and Charges");
// 	} catch (e) {
// 		console.warn("erpnext integrations skipped:", e);
// 	}
// }


// // -------------------- Helper Functions --------------------
// function safeNumber(v) {
// 	if (v === null || v === undefined || v === "") return 0;
// 	if (typeof v === "string") v = v.replace(/,/g, "");
// 	const n = Number(v);
// 	return isNaN(n) ? 0 : n;
// }


// // -------------------- Compute Total --------------------
// function recompute_total(frm) {
// 	let bom_total = 0.0;

// 	if (frm.doc.estimated_bom_materials && Array.isArray(frm.doc.estimated_bom_materials)) {
// 		frm.doc.estimated_bom_materials.forEach(row => {
// 			bom_total += safeNumber(row.amount);
// 		});
// 	}

// 	const total = Number(bom_total.toFixed(2));
// 	if (frm.doc.total !== total) {
// 		frm.set_value("total", total);
// 		frm.refresh_field("total");
// 	}

// 	update_first_item_rate_only(frm, total);
// }


// // -------------------- Sync BOM Total to First Item Rate Only --------------------
// function update_first_item_rate_only(frm, total) {
// 	if (!frm.doc.items || frm.doc.items.length === 0) return;

// 	const first = frm.doc.items[0];
// 	const cdt = first.doctype || "Estimate Item";
// 	const cdn = first.name;

// 	const qty = safeNumber(first.qty) || 1;
// 	const computed_rate = Number((total / qty).toFixed(2));

// 	const current_rate = safeNumber(first.rate);
// 	if (current_rate < computed_rate) {
// 		frappe.model.set_value(cdt, cdn, "rate", computed_rate, () => {
// 			const updated_row = locals[cdt][cdn];
// 			const updated_qty = safeNumber(updated_row.qty) || qty;
// 			const updated_amount = Number((updated_qty * safeNumber(computed_rate)).toFixed(2));
// 			frappe.model.set_value(cdt, cdn, "amount", updated_amount, () => {
// 				frm.refresh_field("items");
// 				recompute_total(frm);
// 			});
// 		});
// 	}
// }


// // -------------------- Compute Total Net Weight --------------------
// function recompute_total_net_weight(frm) {
// 	let total = 0.0;

// 	if (frm.doc.items && Array.isArray(frm.doc.items)) {
// 		frm.doc.items.forEach(row => {
// 			const weight =
// 				row.total_weight !== undefined && row.total_weight !== null && row.total_weight !== ""
// 					? safeNumber(row.total_weight)
// 					: safeNumber(row.qty);
// 			total += weight;
// 		});
// 	}

// 	const total_rounded = Number(total.toFixed(4));
// }


// // -------------------- Estimate Form Hooks --------------------

// frappe.ui.form.on("Estimate", {
// 	// -------------------- Auto Fetch Default BOM --------------------
// 	finished_goods(frm) {
// 		if (!frm.doc.finished_goods) return;

// 		frappe.db.get_value("Item", frm.doc.finished_goods, "default_bom", (r) => {
// 			if (r && r.default_bom) {
// 				frm.set_value("bom", r.default_bom);
// 			} else {
// 				frappe.msgprint(__("No Default BOM found for this Finished Goods item."));
// 				frm.set_value("bom", "");
// 			}
// 		});
// 	},

// 	// -------------------- Fetch BOM Items into Estimated BOM Materials --------------------
// 	get_items_from_bom(frm) {
// 		if (!frm.doc.bom) {
// 			frappe.msgprint(__("Please select a BOM first."));
// 			return;
// 		}

// 		frappe.call({
// 			method: "frappe.client.get",
// 			args: { doctype: "BOM", name: frm.doc.bom },
// 			callback: function (r) {
// 				if (!r.message) {
// 					frappe.msgprint(__("BOM not found."));
// 					return;
// 				}

// 				const bom = r.message;
// 				if (!bom.items || bom.items.length === 0) {
// 					frappe.msgprint(__("No items found in the selected BOM."));
// 					return;
// 				}

// 				// Avoid duplicate entries
// 				const existing_items = new Set(
// 					(frm.doc.estimated_bom_materials || []).map(row => row.item_code)
// 				);

// 				let added = 0;
// 				bom.items.forEach((bom_item) => {
// 					if (existing_items.has(bom_item.item_code)) return; // skip duplicates

// 					let row = frm.add_child("estimated_bom_materials");
// 					row.item_code = bom_item.item_code;
// 					row.item_name = bom_item.item_name;
// 					row.length = bom_item.custom_length || 0;
// 					row.width = bom_item.custom_width || 0;
// 					row.thickness = bom_item.custom_thickness || 0;
// 					row.density = bom_item.custom_density || 0;
// 					row.kilogramskgs = bom_item.custom_kilogramskgs || 0;
// 					row.qty = bom_item.qty || 1;
// 					row.uom = bom_item.uom || "Nos";

// 					existing_items.add(bom_item.item_code);
// 					added++;
// 				});

// 				if (added > 0) {
// 					frappe.msgprint(__("{0} new item(s) added from BOM.", [added]));
// 				} else {
// 					frappe.msgprint(__("All BOM items already exist — no duplicates added."));
// 				}

// 				frm.refresh_field("estimated_bom_materials");
// 			},
// 		});
// 	},

// 	// -------------------- Create Quotation Button after Submission --------------------
// 	refresh(frm) {
// 		if (frm.doc.docstatus === 1) {
// 			cur_frm?.page?.set_inner_btn_group_as_primary?.(__("Create"));

// 			frm.add_custom_button(__('Quotation'), function() {
// 				// Step 1: Check if a Quotation already exists for this Estimate
// 				frappe.call({
// 					method: "frappe.client.get_list",
// 					args: {
// 						doctype: "Quotation",
// 						filters: {
// 							custom_crfq__tender_id: frm.doc.crfq__tender_id
// 						},
// 						fields: ["name"],
// 						limit: 1
// 					},
// 					callback: function (r) {
// 						if (r.message && r.message.length > 0) {
// 							// ✅ Quotation already exists, open it directly
// 							let existing_quotation = r.message[0].name;
// 							frappe.msgprint(__("Quotation already exists for this Estimate. Opening it."));
// 							frappe.set_route("Form", "Quotation", existing_quotation);
// 							return;
// 						}

// 						// Step 2: No Quotation found, create new one
// 						frappe.route_options = {
// 							valid_till: frm.doc.valid_till,
// 							total: frm.doc.total,
// 							party_name: frm.doc.customer_name,
// 							custom_crfq__tender_id: frm.doc.crfq__tender_id || "",
// 						};

// 						const estimate_items = (frm.doc.items || [])
// 							.filter(row => row.item_code)
// 							.map(row => ({
// 								item_code: row.item_code,
// 								item_name: row.item_name,
// 								qty: row.qty,
// 								uom: row.uom,
// 								description: row.description,
// 								rate: row.rate,
// 								amount: row.amount,
// 							}));

// 						if (!estimate_items.length) {
// 							frappe.msgprint(__("No valid items found to create a Quotation."));
// 							return;
// 						}

// 						localStorage.setItem("estimate_items_temp", JSON.stringify(estimate_items));
// 						frappe.set_route('Form', 'Quotation', 'new-quotation');
// 					}
// 				});
// 			}, __('Create'));
// 		}
// 	},
// });


// // -------------------- Estimate Item Hooks --------------------
// frappe.ui.form.on("Estimate Item", {
// 	item_code(frm, cdt, cdn) {
// 		const row = locals[cdt][cdn];
// 		const item_code = row.item_code;

// 		if (!item_code) return;

// 		frappe.db.get_value("Item", item_code, ["item_name"], (value) => {
// 			if (value && value.item_name) {
// 				frappe.model.set_value(cdt, cdn, "item_name", value.item_name);
// 			}
// 		});
// 	},

// 	rate(frm, cdt, cdn) {
// 		const row = locals[cdt][cdn];
// 		const qty = safeNumber(row.qty) || 1;
// 		const entered_rate = safeNumber(row.rate);

// 		const parent_total = safeNumber(frm.doc.total);
// 		const min_rate = Number((parent_total / qty).toFixed(2));

// 		const is_first = frm.doc.items && frm.doc.items.length > 0 && frm.doc.items[0].name === cdn;

// 		if (is_first) {
// 			if (entered_rate < min_rate) {
// 				frappe.msgprint({
// 					title: __("Invalid Rate"),
// 					message: __(
// 						"Entered rate ({0}) is less than the minimum allowed rate ({1}). Reverting to minimum rate.",
// 						[entered_rate.toFixed(2), min_rate.toFixed(2)]
// 					),
// 					indicator: "red",
// 				});

// 				frappe.model.set_value(cdt, cdn, "rate", min_rate, () => {
// 					const updated_amount = Number((qty * safeNumber(min_rate)).toFixed(2));
// 					frappe.model.set_value(cdt, cdn, "amount", updated_amount, () => {
// 						frm.refresh_field("items");
// 						recompute_total(frm);
// 					});
// 				});
// 				return;
// 			}
// 		}

// 		const amount = Number((qty * entered_rate).toFixed(2));
// 		frappe.model.set_value(cdt, cdn, "amount", amount, () => {
// 			recompute_total(frm);
// 		});
// 	},

// 	qty(frm, cdt, cdn) {
// 		const row = locals[cdt][cdn];
// 		const amount = Number((safeNumber(row.qty) * safeNumber(row.rate)).toFixed(2));
// 		frappe.model.set_value(cdt, cdn, "amount", amount, () => {
// 			recompute_total(frm);
// 			recompute_total_net_weight(frm);
// 		});
// 	},

// 	total_weight(frm, cdt, cdn) {
// 		recompute_total_net_weight(frm);
// 	}
// });

// // -------------------- Estimated BOM Materials Hooks --------------------
// frappe.ui.form.on("Estimated BOM Materials", {
// 	rate: compute_bom_amount,
// 	qty: compute_bom_amount,
// 	margin: compute_bom_amount,

// 	length: calculate_bom_weight,
// 	width: calculate_bom_weight,
// 	thickness: calculate_bom_weight,
// 	density: calculate_bom_weight,

// 	estimated_bom_materials_add(frm, cdt, cdn) {
// 		const row = locals[cdt][cdn];
// 		row.uom = "Kg";
// 		frappe.model.set_value(cdt, cdn, "margin", 0);
// 		frappe.model.set_value(cdt, cdn, "amount", 0);
// 		frm.refresh_field("estimated_bom_materials");
// 	},
// });


// // Fixed Margin Logic (percentage-based)
// function compute_bom_amount(frm, cdt, cdn) {
// 	const row = locals[cdt][cdn];
// 	const rate = safeNumber(row.rate);
// 	const qty = safeNumber(row.qty);
// 	const margin = safeNumber(row.margin); // % value

// 	const base_amount = qty * rate;
// 	const margin_amount = base_amount * (margin / 100.0);
// 	row.amount = Number((base_amount + margin_amount).toFixed(2));

// 	row.uom = "Kg";
// 	frm.refresh_field("estimated_bom_materials");
// 	recompute_total(frm);
// }


// // -------------------- Kilogram Calculation Logic --------------------
// function calculate_bom_weight(frm, cdt, cdn) {
// 	let d = locals[cdt][cdn];

// 	if (d.length && d.width && d.thickness && d.density) {
// 		let length_m = safeNumber(d.length) / 1000;
// 		let width_m = safeNumber(d.width) / 1000;
// 		let thickness_m = safeNumber(d.thickness) / 1000;

// 		let volume_m3 = length_m * width_m * thickness_m;
// 		let density_kg_m3 = safeNumber(d.density) * 1000;
// 		let weight_kg = volume_m3 * density_kg_m3;

// 		frappe.model.set_value(cdt, cdn, "kilogramskgs", Number(weight_kg.toFixed(4)));
// 		frappe.model.set_value(cdt, cdn, "qty", Number(weight_kg.toFixed(4)));
// 		frappe.model.set_value(cdt, cdn, "uom", "Kg");

// 		frm.refresh_field("estimated_bom_materials");
// 	} else {
// 		frappe.model.set_value(cdt, cdn, "kilogramskgs", 0);
// 		frappe.model.set_value(cdt, cdn, "uom", "Kg");
// 	}
// }



// // -------------------- ERPNext Controller Extension --------------------


// // -------------------- Legacy / Optional Hooks --------------------
// frappe.ui.form.on("Estimate Item", {
//    items_on_form_rendered(frm, cdt, cdn) {},
// });

// frappe.ui.form.on("Estimate Item", "stock_balance", function (frm, cdt, cdn) {
//    var d = frappe.model.get_doc(cdt, cdn);
//    frappe.route_options = { item_code: d.item_code };
//    frappe.set_route("query-report", "Stock Balance");
// });

// // -------------------- Estimated Operation --------------------
// frappe.ui.form.on('Estimated Operation', {
//     estimate_qty: function(frm, cdt, cdn) {
//         calculate_amount(frm, cdt, cdn);
//     },
//     estimate_rate: function(frm, cdt, cdn) {
//         calculate_amount(frm, cdt, cdn);
//     },
//     estimate_margin: function(frm, cdt, cdn) {
//         apply_margin(frm, cdt, cdn);
//     }
// });

// function calculate_amount(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];
//     let qty = flt(row.estimate_qty);
//     let rate = flt(row.estimate_rate);

//     let amount = qty * rate;
//     frappe.model.set_value(cdt, cdn, 'estimate_amount', amount);
// }

// function apply_margin(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];
//     let qty = flt(row.estimate_qty);
//     let rate = flt(row.estimate_rate);
//     let margin = flt(row.estimate_margin);

//     let base_amount = qty * rate;
//     let total_amount = base_amount + (base_amount * (margin / 100.0));

//     frappe.model.set_value(cdt, cdn, 'estimate_amount', total_amount);
// }

















// // erp_custom/doctype/estimate/estimate.js
// // Copyright (c) 2015,
// // Frappe Technologies Pvt. Ltd.
// // License: GNU General Public License v3. See license.txt


// // -------------------- ERPNext Controller Setup --------------------
// if (typeof erpnext !== "undefined" && erpnext) {
// 	try {
// 		erpnext.accounts.taxes.setup_tax_validations("Sales Taxes and Charges Template");
// 		erpnext.accounts.taxes.setup_tax_filters("Sales Taxes and Charges");
// 	} catch (e) {
// 		console.warn("erpnext integrations skipped:", e);
// 	}
// }


// // -------------------- Helper Functions --------------------
// function safeNumber(v) {
// 	if (v === null || v === undefined || v === "") return 0;
// 	if (typeof v === "string") v = v.replace(/,/g, "");
// 	const n = Number(v);
// 	return isNaN(n) ? 0 : n;
// }


// // -------------------- Compute Total --------------------
// function recompute_total(frm) {
// 	let bom_total = 0.0;

// 	if (frm.doc.estimated_bom_materials && Array.isArray(frm.doc.estimated_bom_materials)) {
// 		frm.doc.estimated_bom_materials.forEach(row => {
// 			bom_total += safeNumber(row.amount);
// 		});
// 	}

// 	const total = Number(bom_total.toFixed(2));
// 	if (frm.doc.total !== total) {
// 		frm.set_value("total", total);
// 		frm.refresh_field("total");
// 	}

// 	update_first_item_rate_only(frm, total);
// }


// // -------------------- Sync BOM Total to First Item Rate Only --------------------
// function update_first_item_rate_only(frm, total) {
// 	if (!frm.doc.items || frm.doc.items.length === 0) return;

// 	const first = frm.doc.items[0];
// 	const cdt = first.doctype || "Estimate Item";
// 	const cdn = first.name;

// 	const qty = safeNumber(first.qty) || 1;
// 	const computed_rate = Number((total / qty).toFixed(2));

// 	const current_rate = safeNumber(first.rate);
// 	if (current_rate < computed_rate) {
// 		frappe.model.set_value(cdt, cdn, "rate", computed_rate, () => {
// 			const updated_row = locals[cdt][cdn];
// 			const updated_qty = safeNumber(updated_row.qty) || qty;
// 			const updated_amount = Number((updated_qty * safeNumber(computed_rate)).toFixed(2));
// 			frappe.model.set_value(cdt, cdn, "amount", updated_amount, () => {
// 				frm.refresh_field("items");
// 				recompute_total(frm);
// 			});
// 		});
// 	}
// }


// // -------------------- Compute Total Net Weight --------------------
// function recompute_total_net_weight(frm) {
// 	let total = 0.0;

// 	if (frm.doc.items && Array.isArray(frm.doc.items)) {
// 		frm.doc.items.forEach(row => {
// 			const weight =
// 				row.total_weight !== undefined && row.total_weight !== null && row.total_weight !== ""
// 					? safeNumber(row.total_weight)
// 					: safeNumber(row.qty);
// 			total += weight;
// 		});
// 	}

// 	const total_rounded = Number(total.toFixed(4));
// 	// You were computing but not storing anywhere — keep if needed later
// }


// // -------------------- Estimate Form Hooks --------------------

// /**
//  * Helper: recursively fetch a BOM and return an array of flat bom items (no nested BOM entries)
//  * - bom_name: name of the BOM to fetch
//  * - opts: { visited:Set, depth:int, max_depth:int }
//  * - cb(err, itemsArray)
//  *
//  * Behavior:
//  * - If a BOM item itself references another BOM (via bom_no OR item_code starting with "BOM-"),
//  *   it will recurse and flatten that BOM's items into the returned array.
//  * - Avoid infinite recursion using visited set and max_depth (default 5).
//  * - Each returned array element is the raw BOM item object from the BOM record (keeps fields like item_code, qty, uom, item_name, length/width/thickness/density if present).
//  */
// function fetch_bom_recursive(bom_name, opts, cb) {
// 	if (!bom_name) return cb("No BOM name provided");

// 	opts = opts || {};
// 	const visited = opts.visited || new Set();
// 	const max_depth = typeof opts.max_depth === "number" ? opts.max_depth : 5;
// 	const depth = typeof opts.depth === "number" ? opts.depth : 0;

// 	if (depth > max_depth) {
// 		return cb("Max BOM recursion depth reached");
// 	}
// 	if (visited.has(bom_name)) {
// 		return cb(null, []); 
// 	}
// 	visited.add(bom_name);

// 	frappe.call({
// 		method: "frappe.client.get",
// 		args: { doctype: "BOM", name: bom_name },
// 		callback: function (r) {
// 			if (!r || !r.message) {
// 				return cb("BOM not found: " + bom_name);
// 			}

// 			const bom = r.message;
// 			const items = Array.isArray(bom.items) ? bom.items.slice() : [];
// 			// We'll process sequentially to allow recursion
// 			const final_items = [];

// 			let idx = 0;
// 			function next() {
// 				if (idx >= items.length) {
// 					return cb(null, final_items);
// 				}
// 				const bi = items[idx++];
// 				// If this bom item points to another BOM, recurse into it
// 				// Check common fields: `bom_no` (some setups) or item_code looks like a BOM name (BOM-...)
// 				const potential_bom = (bi.bom_no || "").toString().trim() || (bi.item_code || "").toString().trim();
// 				// Determine heuristics: if `bom_no` exists or item_code looks like "BOM-" prefix or contains "BOM-"
// 				const looks_like_bom = !!bi.bom_no || (/^BOM[-\/]/i.test(bi.item_code || "") || /\bBOM[-\/]/i.test(bi.item_code || ""));

// 				if (looks_like_bom) {
// 					// Pick bom identifier (bom_no precedence)
// 					const inner_bom_name = (bi.bom_no && bi.bom_no.toString().trim()) || (bi.item_code && bi.item_code.toString().trim());
// 					// If inner_bom_name equals the parent BOM name or already visited, skip recursion
// 					if (!inner_bom_name || visited.has(inner_bom_name)) {
// 						// skip recursive dive; treat current bi as a normal item (best-effort)
// 						final_items.push(bi);
// 						return next();
// 					}
// 					// recurse
// 					fetch_bom_recursive(inner_bom_name, { visited: visited, depth: depth + 1, max_depth: max_depth }, function (err, inner_items) {
// 						if (err) {
// 							// if recursion fails, fallback to adding the current entry as-is
// 							final_items.push(bi);
// 							return next();
// 						}
// 						// flatten inner items
// 						(inner_items || []).forEach(ii => final_items.push(ii));
// 						return next();
// 					});
// 				} else {
// 					// Normal raw material item — push
// 					final_items.push(bi);
// 					return next();
// 				}
// 			}
// 			next();
// 		}
// 	});
// }


// frappe.ui.form.on("Estimate", {
// 	// -------------------- Auto Fetch Default BOM --------------------
// 	finished_goods(frm) {
// 		if (!frm.doc.finished_goods) return;

// 		frappe.db.get_value("Item", frm.doc.finished_goods, "default_bom", (r) => {
// 			if (r && r.default_bom) {
// 				frm.set_value("bom", r.default_bom);
// 			} else {
// 				frappe.msgprint(__("No Default BOM found for this Finished Goods item."));
// 				frm.set_value("bom", "");
// 			}
// 		});
// 	},

// 	// -------------------- Fetch BOM Items into Estimated BOM Materials --------------------
// 	get_items_from_bom(frm) {
// 		// validate BOM selected
// 		if (!frm.doc.bom) {
// 			frappe.msgprint(__("Please select a BOM first."));
// 			return;
// 		}

// 		const bom_name = frm.doc.bom;

// 		// Use recursive fetch to flatten nested BOMs as described by user example
// 		fetch_bom_recursive(bom_name, { max_depth: 6 }, function (err, flat_items) {
// 			if (err) {
// 				frappe.msgprint(__(`Error fetching BOM: ${err}`));
// 				return;
// 			}
// 			if (!flat_items || !flat_items.length) {
// 				frappe.msgprint(__("No items found in the selected BOM (or nested BOMs)."));
// 				return;
// 			}

// 			// Normalize existing item codes in estimate child table for reliable dedupe
// 			const existing_set = new Set(
// 				(frm.doc.estimated_bom_materials || [])
// 					.map(row => (row.item_code || "").toString().trim().toLowerCase())
// 					.filter(Boolean)
// 			);

// 			// Track newly created children: { item_code, child_name, child_doctype }
// 			const newly_created = [];

// 			flat_items.forEach(bom_item => {
// 				// Some BOM item objects may have different fields; prefer bom_item.item_code
// 				const item_code = bom_item.item_code || bom_item.item || "";
// 				if (!item_code) return;

// 				const incoming_norm = item_code.toString().trim().toLowerCase();
// 				if (existing_set.has(incoming_norm)) {
// 					// already exists — skip
// 					return;
// 				}

// 				// create child reliably
// 				const child = frappe.model.add_child(frm.doc, "Estimated BOM Materials", "estimated_bom_materials");

// 				try {
// 					frappe.model.set_value(child.doctype, child.name, "item_code", item_code);
// 					frappe.model.set_value(child.doctype, child.name, "item_name", bom_item.item_name || bom_item.description || "");
// 					// dimension fallbacks
// 					frappe.model.set_value(child.doctype, child.name, "length", bom_item.custom_length || bom_item.length || 0);
// 					frappe.model.set_value(child.doctype, child.name, "width", bom_item.custom_width || bom_item.width || 0);
// 					frappe.model.set_value(child.doctype, child.name, "thickness", bom_item.custom_thickness || bom_item.thickness || 0);
// 					frappe.model.set_value(child.doctype, child.name, "density", bom_item.custom_density || bom_item.density || 0);
// 					frappe.model.set_value(child.doctype, child.name, "kilogramskgs", bom_item.custom_kilogramskgs || 0);
// 					// qty: BOM qty * parent BOM qty if present on Estimate? For now we use bom_item.qty or 1
// 					frappe.model.set_value(child.doctype, child.name, "qty", safeNumber(bom_item.qty) || 1);
// 					frappe.model.set_value(child.doctype, child.name, "uom", bom_item.uom || "Nos");
// 					frappe.model.set_value(child.doctype, child.name, "margin", 0);
// 					frappe.model.set_value(child.doctype, child.name, "amount", 0);
// 				} catch (e) {
// 					// If set_value fails (older frappe), set properties directly then refresh at end
// 					child.item_code = item_code;
// 					child.item_name = bom_item.item_name || bom_item.description || "";
// 					child.length = bom_item.custom_length || bom_item.length || 0;
// 					child.width = bom_item.custom_width || bom_item.width || 0;
// 					child.thickness = bom_item.custom_thickness || bom_item.thickness || 0;
// 					child.density = bom_item.custom_density || bom_item.density || 0;
// 					child.kilogramskgs = bom_item.custom_kilogramskgs || 0;
// 					child.qty = safeNumber(bom_item.qty) || 1;
// 					child.uom = bom_item.uom || "Nos";
// 					child.margin = 0;
// 					child.amount = 0;
// 				}

// 				// mark to avoid duplicates in same run
// 				existing_set.add(incoming_norm);
// 				newly_created.push({
// 					item_code: item_code,
// 					child_name: child.name,
// 					child_doctype: child.doctype
// 				});
// 			});

// 			// refresh to show newly added child rows immediately
// 			frm.refresh_field("estimated_bom_materials");

// 			// If nothing added, show clear message and exit
// 			if (newly_created.length === 0) {
// 				frappe.msgprint(__("No new items were added — all BOM items are already present."));
// 				return;
// 			}

// 			// Map item_code -> list of child rows to update rate & amount
// 			const map_children = {};
// 			(frm.doc.estimated_bom_materials || []).forEach(child => {
// 				const code = (child.item_code || "") + "";
// 				if (!map_children[code]) map_children[code] = [];
// 				map_children[code].push(child);
// 			});

// 			// For each distinct item_code added, fetch allowed rate fields and set rate
// 			const distinct_codes = [...new Set(newly_created.map(n => n.item_code))];
// 			let remaining = distinct_codes.length;

// 			distinct_codes.forEach(item_code => {
// 				frappe.db.get_value("Item", item_code, ["valuation_rate", "standard_rate", "last_purchase_rate"], (val) => {
// 					let rate_to_set = 0;
// 					if (val) {
// 						if (safeNumber(val.valuation_rate) > 0) rate_to_set = safeNumber(val.valuation_rate);
// 						else if (safeNumber(val.standard_rate) > 0) rate_to_set = safeNumber(val.standard_rate);
// 						else if (safeNumber(val.last_purchase_rate) > 0) rate_to_set = safeNumber(val.last_purchase_rate);
// 					}

// 					// find matching child rows
// 					const child_rows = map_children[item_code] || [];
// 					child_rows.forEach(child => {
// 						const cdt = child.doctype || "Estimated BOM Materials";
// 						const cdn = child.name;
// 						try {
// 							frappe.model.set_value(cdt, cdn, "rate", rate_to_set, () => {
// 								if (locals[cdt] && locals[cdt][cdn]) {
// 									compute_bom_amount(frm, cdt, cdn);
// 								}
// 							});
// 						} catch (err) {
// 							// fallback: directly update object (will be shown on next refresh)
// 							child.rate = rate_to_set;
// 							child.amount = Number((safeNumber(child.qty) * rate_to_set).toFixed(2));
// 						}
// 					});

// 					remaining--;
// 					if (remaining === 0) {
// 						// final UI refresh and totals compute
// 						frm.refresh_field("estimated_bom_materials");
// 						recompute_total(frm);
// 						frappe.msgprint(__("{0} item(s) added from BOM.", [newly_created.length]));
// 					}
// 				});
// 			});
// 		}); 
// 	}, 

// 	// -------------------- Create Quotation Button after Submission --------------------
// 	refresh(frm) {
// 		if (frm.doc.docstatus === 1) {
// 			cur_frm?.page?.set_inner_btn_group_as_primary?.(__("Create"));

// 			frm.add_custom_button(__('Quotation'), function() {
// 				// Step 1: Check if a Quotation already exists for this Estimate
// 				frappe.call({
// 					method: "frappe.client.get_list",
// 					args: {
// 						doctype: "Quotation",
// 						filters: {
// 							custom_crfq__tender_id: frm.doc.crfq__tender_id
// 						},
// 						fields: ["name"],
// 						limit: 1
// 					},
// 					callback: function (r) {
// 						if (r.message && r.message.length > 0) {
// 							// ✅ Quotation already exists, open it directly
// 							let existing_quotation = r.message[0].name;
// 							frappe.msgprint(__("Quotation already exists for this Estimate. Opening it."));
// 							frappe.set_route("Form", "Quotation", existing_quotation);
// 							return;
// 						}

// 						// Step 2: No Quotation found, create new one
// 						frappe.route_options = {
// 							valid_till: frm.doc.valid_till,
// 							total: frm.doc.total,
// 							party_name: frm.doc.customer_name,
// 							custom_crfq__tender_id: frm.doc.crfq__tender_id || "",
// 						};

// 						const estimate_items = (frm.doc.items || [])
// 							.filter(row => row.item_code)
// 							.map(row => ({
// 								item_code: row.item_code,
// 								item_name: row.item_name,
// 								qty: row.qty,
// 								uom: row.uom,
// 								description: row.description,
// 								rate: row.rate,
// 								amount: row.amount,
// 							}));

// 						if (!estimate_items.length) {
// 							frappe.msgprint(__("No valid items found to create a Quotation."));
// 							return;
// 						}

// 						localStorage.setItem("estimate_items_temp", JSON.stringify(estimate_items));
// 						frappe.set_route('Form', 'Quotation', 'new-quotation');
// 					}
// 				});
// 			}, __('Create'));
// 		}
// 	},
// });


// // -------------------- Estimate Item Hooks --------------------
// frappe.ui.form.on("Estimate Item", {
// 	item_code(frm, cdt, cdn) {
// 		const row = locals[cdt][cdn];
// 		const item_code = row.item_code;

// 		if (!item_code) return;

// 		frappe.db.get_value("Item", item_code, ["item_name"], (value) => {
// 			if (value && value.item_name) {
// 				frappe.model.set_value(cdt, cdn, "item_name", value.item_name);
// 			}
// 		});
// 	},

// 	rate(frm, cdt, cdn) {
// 		const row = locals[cdt][cdn];
// 		const qty = safeNumber(row.qty) || 1;
// 		const entered_rate = safeNumber(row.rate);

// 		const parent_total = safeNumber(frm.doc.total);
// 		const min_rate = Number((parent_total / qty).toFixed(2));

// 		const is_first = frm.doc.items && frm.doc.items.length > 0 && frm.doc.items[0].name === cdn;

// 		if (is_first) {
// 			if (entered_rate < min_rate) {
// 				frappe.msgprint({
// 					title: __("Invalid Rate"),
// 					message: __(
// 						"Entered rate ({0}) is less than the minimum allowed rate ({1}). Reverting to minimum rate.",
// 						[entered_rate.toFixed(2), min_rate.toFixed(2)]
// 					),
// 					indicator: "red",
// 				});

// 				frappe.model.set_value(cdt, cdn, "rate", min_rate, () => {
// 					const updated_amount = Number((qty * safeNumber(min_rate)).toFixed(2));
// 					frappe.model.set_value(cdt, cdn, "amount", updated_amount, () => {
// 						frm.refresh_field("items");
// 						recompute_total(frm);
// 					});
// 				});
// 				return;
// 			}
// 		}

// 		const amount = Number((qty * entered_rate).toFixed(2));
// 		frappe.model.set_value(cdt, cdn, "amount", amount, () => {
// 			recompute_total(frm);
// 		});
// 	},

// 	qty(frm, cdt, cdn) {
// 		const row = locals[cdt][cdn];
// 		const amount = Number((safeNumber(row.qty) * safeNumber(row.rate)).toFixed(2));
// 		frappe.model.set_value(cdt, cdn, "amount", amount, () => {
// 			recompute_total(frm);
// 			recompute_total_net_weight(frm);
// 		});
// 	},

// 	total_weight(frm, cdt, cdn) {
// 		recompute_total_net_weight(frm);
// 	}
// });

// // -------------------- Estimated BOM Materials Hooks --------------------
// frappe.ui.form.on("Estimated BOM Materials", {
// 	rate: compute_bom_amount,
// 	qty: compute_bom_amount,
// 	margin: compute_bom_amount,

// 	length: calculate_bom_weight,
// 	width: calculate_bom_weight,
// 	thickness: calculate_bom_weight,
// 	density: calculate_bom_weight,

// 	estimated_bom_materials_add(frm, cdt, cdn) {
// 		const row = locals[cdt][cdn];
// 		row.uom = "Kg";
// 		frappe.model.set_value(cdt, cdn, "margin", 0);
// 		frappe.model.set_value(cdt, cdn, "amount", 0);
// 		frm.refresh_field("estimated_bom_materials");
// 	},
// });


// // Fixed Margin Logic (percentage-based)
// function compute_bom_amount(frm, cdt, cdn) {
// 	const row = locals[cdt][cdn];
// 	const rate = safeNumber(row.rate);
// 	const qty = safeNumber(row.qty);
// 	const margin = safeNumber(row.margin); // % value

// 	const base_amount = qty * rate;
// 	const margin_amount = base_amount * (margin / 100.0);
// 	row.amount = Number((base_amount + margin_amount).toFixed(2));

// 	row.uom = "Kg";
// 	frm.refresh_field("estimated_bom_materials");
// 	recompute_total(frm);
// }


// // -------------------- Kilogram Calculation Logic --------------------
// function calculate_bom_weight(frm, cdt, cdn) {
// 	let d = locals[cdt][cdn];

// 	if (d.length && d.width && d.thickness && d.density) {
// 		let length_m = safeNumber(d.length) / 1000;
// 		let width_m = safeNumber(d.width) / 1000;
// 		let thickness_m = safeNumber(d.thickness) / 1000;

// 		let volume_m3 = length_m * width_m * thickness_m;
// 		let density_kg_m3 = safeNumber(d.density) * 1000;
// 		let weight_kg = volume_m3 * density_kg_m3;

// 		frappe.model.set_value(cdt, cdn, "kilogramskgs", Number(weight_kg.toFixed(4)));
// 		frappe.model.set_value(cdt, cdn, "qty", Number(weight_kg.toFixed(4)));
// 		frappe.model.set_value(cdt, cdn, "uom", "Kg");

// 		frm.refresh_field("estimated_bom_materials");
// 	} else {
// 		frappe.model.set_value(cdt, cdn, "kilogramskgs", 0);
// 		frappe.model.set_value(cdt, cdn, "uom", "Kg");
// 	}
// }



// // -------------------- ERPNext Controller Extension --------------------


// // -------------------- Legacy / Optional Hooks --------------------
// frappe.ui.form.on("Estimate Item", {
//    items_on_form_rendered(frm, cdt, cdn) {},
// });

// frappe.ui.form.on("Estimate Item", "stock_balance", function (frm, cdt, cdn) {
//    var d = frappe.model.get_doc(cdt, cdn);
//    frappe.route_options = { item_code: d.item_code };
//    frappe.set_route("query-report", "Stock Balance");
// });

// // -------------------- Estimated Operation --------------------
// frappe.ui.form.on('Estimated Operation', {
//     estimate_qty: function(frm, cdt, cdn) {
//         calculate_amount(frm, cdt, cdn);
//     },
//     estimate_rate: function(frm, cdt, cdn) {
//         calculate_amount(frm, cdt, cdn);
//     },
//     estimate_margin: function(frm, cdt, cdn) {
//         apply_margin(frm, cdt, cdn);
//     }
// });

// function calculate_amount(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];
//     let qty = flt(row.estimate_qty);
//     let rate = flt(row.estimate_rate);

//     let amount = qty * rate;
//     frappe.model.set_value(cdt, cdn, 'estimate_amount', amount);
// }

// function apply_margin(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];
//     let qty = flt(row.estimate_qty);
//     let rate = flt(row.estimate_rate);
//     let margin = flt(row.estimate_margin);

//     let base_amount = qty * rate;
//     let total_amount = base_amount + (base_amount * (margin / 100.0));

//     frappe.model.set_value(cdt, cdn, 'estimate_amount', total_amount);
// }







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

function update_first_item_rate_only(frm, total) {
	if (!frm.doc.items || !frm.doc.items.length) return;
	const first = frm.doc.items[0];
	const qty = safeNumber(first.qty) || 1;
	const rate = Number((total / qty).toFixed(2));
	if (safeNumber(first.rate) < rate) {
		frappe.model.set_value(first.doctype, first.name, "rate", rate);
		frappe.model.set_value(first.doctype, first.name, "amount", qty * rate);
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

	let bom_list = frm.doc.estimated_bom_materials
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


	// Quotation button logic (unchanged)
	refresh(frm) {
		if (frm.doc.docstatus === 1) {
			cur_frm.page.set_inner_btn_group_as_primary(__("Create"));
			frm.add_custom_button(__('Quotation'), () => {
				frappe.call({
					method: "frappe.client.get_list",
					args: {
						doctype: "Quotation",
						filters: { custom_crfq__tender_id: frm.doc.crfq__tender_id },
						fields: ["name"], limit: 1
					},
					callback: (r) => {
						if (r.message && r.message.length) {
							frappe.msgprint(__("Quotation already exists."));
							return frappe.set_route("Form", "Quotation", r.message[0].name);
						}
						frappe.route_options = {
							valid_till: frm.doc.valid_till,
							total: frm.doc.total,
							party_name: frm.doc.customer_name,
							custom_crfq__tender_id: frm.doc.crfq__tender_id || "",
						};
						const items = (frm.doc.items || [])
							.filter(i => i.item_code)
							.map(i => ({
								item_code: i.item_code,
								item_name: i.item_name,
								qty: i.qty,
								uom: i.uom,
								rate: i.rate,
								amount: i.amount
							}));
						if (!items.length) return frappe.msgprint(__("No valid items."));
						localStorage.setItem("estimate_items_temp", JSON.stringify(items));
						frappe.set_route("Form", "Quotation", "new-quotation");
					}
				});
			}, __('Create'));
		}
	},
});

// -------------------- Estimated BOM Materials Hooks --------------------
frappe.ui.form.on("Estimated BOM Materials", {
	rate: compute_bom_amount,
	qty: compute_bom_amount,
	margin: compute_bom_amount,
	length: calculate_bom_weight,
	width: calculate_bom_weight,
	thickness: calculate_bom_weight,
	density: calculate_bom_weight,
	estimated_bom_materials_add(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		row.uom = "Kg";
		row.margin = 0;
		row.amount = 0;
		frm.refresh_field("estimated_bom_materials");
	},
});

function compute_bom_amount(frm, cdt, cdn) {
	const r = locals[cdt][cdn];
	const base = safeNumber(r.qty) * safeNumber(r.rate);
	const marginAmt = base * (safeNumber(r.margin) / 100);
	r.amount = Number((base + marginAmt).toFixed(2));
	frm.refresh_field("estimated_bom_materials");
	recompute_total(frm);
}

function calculate_bom_weight(frm, cdt, cdn) {
	const d = locals[cdt][cdn];
	if (d.length && d.width && d.thickness && d.density) {
		const vol = (safeNumber(d.length) / 1000) * (safeNumber(d.width) / 1000) * (safeNumber(d.thickness) / 1000);
		const dens = safeNumber(d.density) * 1000;
		const w = vol * dens;
		frappe.model.set_value(cdt, cdn, "kilogramskgs", Number(w.toFixed(4)));
		frappe.model.set_value(cdt, cdn, "qty", Number(w.toFixed(4)));
		frappe.model.set_value(cdt, cdn, "uom", "Kg");
	} else {
		frappe.model.set_value(cdt, cdn, "kilogramskgs", 0);
		frappe.model.set_value(cdt, cdn, "uom", "Kg");
	}
}
