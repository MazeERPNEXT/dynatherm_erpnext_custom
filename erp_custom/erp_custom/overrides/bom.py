# import frappe
# from erpnext.manufacturing.doctype.bom.bom import BOM


# class CustomBOM(BOM):

# 	def get_rm_rate(self, args):

# 		# 🔍 SELF-CHECK MESSAGE
# 		frappe.msgprint("CustomBOM get_rm_rate() is called")

# 		return super().get_rm_rate(args)



# import frappe
# from frappe.utils import flt
# from erpnext.manufacturing.doctype.bom.bom import BOM


# class CustomBOM(BOM):

# 	def get_rm_rate(self, args):
# 		"""
# 	 Fetch rate ONLY from Item Price (Buying)
# 	 Final authority for BOM Item rate
# 	"""

# 		# ---------------------------------------
# 		# Supplier / Customer provided → ZERO
# 		# ---------------------------------------
# 		if args.get("sourced_by_supplier") or args.get("is_customer_provided_item"):
# 			return 0

# 		item_code = args.get("item_code")
# 		if not item_code:
# 			return 0

# 		# ---------------------------------------
# 		# Fetch latest Buying Item Price
# 		# ---------------------------------------
# 		rate = frappe.db.get_value(
# 			"Item Price",
# 			{
# 				"item_code": item_code,
# 				"buying": 1
# 			},
# 			"price_list_rate",
# 			order_by="modified desc"
# 		)

# 		if rate is not None:
# 			return flt(rate)

# 		# ---------------------------------------
# 		# Fallback → ERPNext core logic
# 		# ---------------------------------------
# 		return super().get_rm_rate(args)


# import frappe
# from frappe.utils import flt
# from erpnext.manufacturing.doctype.bom.bom import BOM


# class CustomBOM(BOM):

# 	def get_rm_rate(self, args, **kwargs):
# 		"""Fetch rate from Item Price (Buying)
# 	 Also sync custom_last_purchase_price
# 	 Signature matches ERPNext core"""

# 		# ---------------------------------------
# 		# Supplier / Customer provided → ZERO
# 		# ---------------------------------------
# 		if args.get("sourced_by_supplier") or args.get("is_customer_provided_item"):
# 			return 0

# 		item_code = args.get("item_code")
# 		if not item_code:
# 			return 0

# 		# ---------------------------------------
# 		# Fetch latest Buying Item Price
# 		# ---------------------------------------
# 		rate = frappe.db.get_value(
# 			"Item Price",
# 			{
# 				"item_code": item_code,
# 				"buying": 1
# 			},
# 			"price_list_rate",
# 			order_by="modified desc"
# 		)

# 		rate = flt(rate or 0)

# 		# ---------------------------------------
# 		# Sync custom_last_purchase_price
# 		# (safe: only if row exists)
# 		# ---------------------------------------
# 		row_name = args.get("name")
# 		if row_name:
# 			frappe.db.set_value(
# 				"BOM Item",
# 				row_name,
# 				"custom_last_purchase_price",
# 				rate,
# 				update_modified=False
# 			)

# 		return rate





import frappe
from frappe.utils import flt
from erpnext.manufacturing.doctype.bom.bom import BOM


class CustomBOM(BOM):
	"""
	Custom BOM override:
	- Rate fetched from Item Price
	- Custom amount = qty * rate * custom_total_weight
	- Updates custom_last_purchase_price
	"""

	def get_rm_rate(self, args, **kwargs):
		"""Fetch rate from Item Price (Buying)"""
		if args.get("sourced_by_supplier") or args.get("is_customer_provided_item"):
			return 0

		item_code = args.get("item_code")
		if not item_code:
			return 0

		rate = frappe.db.get_value(
			"Item Price",
			{
				"item_code": item_code,
				"buying": 1
			},
			"price_list_rate",
			order_by="modified desc"
		)
		rate = flt(rate or 0)

		# Sync custom_last_purchase_price
		row_name = args.get("name")
		# if row_name:
		# 	frappe.db.set_value(
		# 		"BOM Item",
		# 		row_name,
		# 		"custom_last_purchase_price",
		# 		rate,
		# 		update_modified=False
		# 	)
		if row_name:
			for d in self.items:
				if d.name == row_name:
					d.custom_last_purchase_price = rate
					break


		return rate

def calculate_cost(self):
		# run standard ERPNext logic first
		super().calculate_cost()

		total_rm_cost = 0

		for item in self.items:
			qty = flt(item.qty)
			rate = flt(item.rate)
			total_weight = flt(item.custom_total_weight)

			# amount = qty × rate × custom_total_weight
			item.amount = flt(qty * rate * total_weight, 2)

			total_rm_cost += item.amount

		# update BOM totals safely
		self.raw_material_cost = total_rm_cost
		self.total_cost = (flt(self.operating_cost) + flt(self.raw_material_cost) + flt(self.scrap_cost))



# import frappe
# from frappe.utils import flt
# from math import pi
# from erpnext.manufacturing.doctype.bom.bom import BOM

# # -----------------------------------------------
# # Whitelisted function called by JS (live calculation)
# # -----------------------------------------------
# @frappe.whitelist()
# def calculate_bom_item(row):
#     row = frappe._dict(frappe.parse_json(row))
#     out = {}

#     # Fetch Item Master
#     item = frappe.db.get_value(
#         "Item",
#         row.item_code,
#         ["item_group", "default_bom", "custom_material_type",
#          "custom_density", "custom_thickness", "valuation_rate"],
#         as_dict=True
#     ) or {}

#     item_group = item.get("item_group")
#     density = flt(item.get("custom_density") or row.custom_density)

#     out.update({
#         "custom_item_group": item_group,
#         "bom_no": item.get("default_bom"),
#         "custom_material_type": item.get("custom_material_type"),
#         "custom_density": density,
#         "custom_thickness": flt(item.get("custom_thickness")),
#     })

#     # RATE (Item Price > Valuation Rate)
#     rate = frappe.db.get_value(
#         "Item Price",
#         {"item_code": row.item_code, "buying": 1},
#         "price_list_rate",
#         order_by="modified desc"
#     ) or item.get("valuation_rate") or 0
#     rate = flt(rate, 2)
#     out["rate"] = rate
#     out["custom_last_purchase_price"] = rate

#     # KG PER UNIT
#     kg_per_unit = 0
#     if density:
#         if item_group == "Plates":
#             kg_per_unit = (flt(row.custom_length) * flt(row.custom_width) * flt(row.custom_thickness) * density) / 1_000_000
#         elif item_group in ("Tubes", "Pipes", "Forgings"):
#             R = flt(row.custom_outer_diameter) / 2
#             r = max(R - flt(row.custom_wall_thickness), 0)
#             kg_per_unit = (pi * (R**2 - r**2) * flt(row.custom_length) * density) / 1_000_000
#         elif item_group in ("Flanges", "Rings"):
#             kg_per_unit = (pi * ((flt(row.custom_outer_diameter)/2)**2 - (flt(row.custom_inner_diameter)/2)**2) * flt(row.custom_thickness) * density) / 1_000_000
#         elif item_group == "Rods":
#             kg_per_unit = (pi * (flt(row.custom_outer_diameter)/2)**2 * flt(row.custom_length) * density) / 1_000_000

#     out["custom_kilogramskgs"] = flt(kg_per_unit, 4)

#     # TOTAL WEIGHT
#     total_weight = flt(row.qty) * out["custom_kilogramskgs"]
#     out["custom_total_weight"] = flt(total_weight, 4)

#     # AMOUNT = qty * rate * custom_total_weight
#     out["amount"] = flt(flt(row.qty) * rate * total_weight, 2)

#     # Scrap & Transportation
#     out["custom_scrap_margin_kgs"] = flt(total_weight * flt(row.custom_scrap_margin_percentage) / 100, 4)
#     out["custom_transportation_cost_kgs"] = flt(total_weight * flt(row.custom_transportation_cost), 2)

#     return out

# # -----------------------------------------------
# # BOM OVERRIDE CLASS
# # -----------------------------------------------
# class CustomBOM(BOM):

#     def get_rm_rate(self, args, **kwargs):
#         """Single source of truth for item rate"""
#         if args.get("sourced_by_supplier") or args.get("is_customer_provided_item"):
#             return 0

#         item_code = args.get("item_code")
#         if not item_code:
#             return 0

#         rate = frappe.db.get_value(
#             "Item Price",
#             {"item_code": item_code, "buying": 1},
#             "price_list_rate",
#             order_by="modified desc"
#         )
#         if not rate:
#             rate = frappe.db.get_value("Item", item_code, "valuation_rate") or 0

#         rate = flt(rate, 2)

#         # Update last purchase price
#         row_name = args.get("name")
#         if row_name:
#             frappe.db.set_value(
#                 "BOM Item",
#                 row_name,
#                 "custom_last_purchase_price",
#                 rate,
#                 update_modified=False
#             )

#         return rate

#     def calculate_rm_cost(self):
#         """Override core BOM raw material cost calculation"""
#         total_rm_cost = 0
#         base_total_rm_cost = 0

#         for item in self.items:
#             qty = flt(item.qty)
#             rate = flt(item.rate)
#             total_weight = flt(item.custom_total_weight)

#             # ✅ CUSTOM AMOUNT LOGIC
#             item.amount = flt(qty * rate * total_weight, 2)
#             item.base_amount = flt(item.amount * self.conversion_rate, 2)
#             item.qty_consumed_per_unit = flt(item.stock_qty) / flt(self.quantity or 1)

#             total_rm_cost += item.amount
#             base_total_rm_cost += item.base_amount

#         self.raw_material_cost = total_rm_cost
#         self.base_raw_material_cost = base_total_rm_cost

#     def calculate_cost(self):
#         """Override ERPNext Core BOM Cost Calculation"""
#         self.calculate_op_cost()  # operating cost
#         self.calculate_rm_cost()  # custom logic
#         self.calculate_scrap_materials_cost()  # scrap cost

#         self.total_cost = flt(self.operating_cost) + flt(self.raw_material_cost) - flt(getattr(self, "scrap_cost", 0))
#         self.base_total_cost = flt(self.base_operating_cost) + flt(self.base_raw_material_cost) - flt(getattr(self, "scrap_cost", 0))
