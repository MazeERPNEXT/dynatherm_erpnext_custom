
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
        super().calculate_cost()

        total_rm_cost = 0

        for item in self.items:
            total_weight = flt(item.custom_total_weight)
            rate_per_kg = flt(item.custom_rate_per_kg)

            # ✅ YOUR LOGIC
            if rate_per_kg and total_weight:
                item.rate = flt(rate_per_kg * total_weight, 2)

            qty = flt(item.qty)
            rate = flt(item.rate)

            item.amount = flt(qty * rate, 2)
            total_rm_cost += item.amount

        self.raw_material_cost = total_rm_cost
        self.total_cost = (flt(self.operating_cost) + flt(self.raw_material_cost) + flt(self.scrap_cost))
