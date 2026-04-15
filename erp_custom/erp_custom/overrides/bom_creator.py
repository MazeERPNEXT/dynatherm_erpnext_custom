        
import frappe
import math
from openpyxl import load_workbook
from frappe.utils import flt
from erpnext.manufacturing.doctype.bom_creator.bom_creator import BOMCreator


# =========================================================
# COMMON CALCULATION FUNCTION (FROM bom.js LOGIC)
# =========================================================
def calculate_values(item):

    def get_val(key):
        return flt(item.get(key) if isinstance(item, dict) else getattr(item, key, 0))

    def set_val(key, value):
        if isinstance(item, dict):
            item[key] = value
        else:
            setattr(item, key, value)

    density = get_val("custom_density")
    item_group = item.get("item_group") if isinstance(item, dict) else getattr(item, "item_group", None)
    item_group = item_group or (item.get("custom_item_group") if isinstance(item, dict) else getattr(item, "custom_item_group", None))

    qty = get_val("qty")

    if not density:
        # set_val("custom_kilogramskgs", 0)
        set_val("custom_total_weight", 0)
        set_val("custom_scrap_margin_kgs", 0)
        set_val("custom_transportation_cost_kgs", 0)
        return item

    base_weight = 0

    length = get_val("custom_length")
    width = get_val("custom_width")
    thickness = get_val("custom_thickness")
    od = get_val("custom_outer_diameter")
    id_ = get_val("custom_inner_diameter")
    wall = get_val("custom_wall_thickness")

    # Plates (SHAPE BASED)
    # if item_group == "Plates":
    #     shape = item.get("custom_shape") if isinstance(item, dict) else getattr(item, "custom_shape", None)
    #     if shape == "N/A":
    #         return item
    #     if not shape:
    #         base_weight = 0

    #     # Rectangle
    #     elif shape == "Rectangle":
    #         if length and width and thickness:
    #             base_weight = (length * width * thickness * density) / 1_000_000

    #     # Circle
    #     elif shape == "Circle":
    #         if od:
    #             base_weight = (math.pi/ 4)  * (od * od) * thickness * density / 1_000_000

    #     # Hollow
    #     elif shape == "Hollow":
    #         if length and id_ and thickness:
    #             OD = id_ + (2 * thickness)
    #             base_weight = ((math.pi / 4) * ((OD ** 2) - (id_ ** 2)) * length * density) / 1_000_000

    # # Tubes / Pipes
    # elif item_group in ["Tubes", "Pipes"]:
    #     R = od / 2
    #     r = max(R - wall, 0)
    #     base_weight = (math.pi * (R**2 - r**2) * length * density) / 1_000_000

    # # Flanges / Rings
    # elif item_group in ["Flanges", "Rings"]:
    #     base_weight = (math.pi * ((od / 2) ** 2 - (id_ / 2) ** 2) * thickness * density) / 1_000_000

    # # Rods
    # elif item_group == "Rods":
    #     base_weight = (math.pi * (od / 2) ** 2 * length * density) / 1_000_000

    # # Forgings
    # elif item_group == "Forgings":
    #     if shape == "N/A":
    #         return item
    #     shape = item.get("custom_shape") if isinstance(item, dict) else getattr(item, "custom_shape", None)
    #     if shape == "Circle":
    #         R = od / 2
    #         r = max(R - wall, 0)
    #         base_weight = (math.pi * (R**2 - r**2) * length * density) / 1_000_000
    
    # Get shape ONCE (FIX)
    shape = item.get("custom_shape") if isinstance(item, dict) else getattr(item, "custom_shape", None)

    # Plates
    if item_group == "Plates":
        if shape == "N/A":
            return item

        elif shape == "Rectangle":
            if length and width and thickness:
                base_weight = (length * width * thickness * density) / 1_000_000

        elif shape == "Circle":
            if od and thickness:
                base_weight = (math.pi / 4) * (od ** 2) * thickness * density / 1_000_000

        elif shape == "Hollow":
            if length and id_ and thickness:
                OD = id_ + (2 * thickness)
                base_weight = ((math.pi / 4) * (OD**2 - id_**2) * length * density) / 1_000_000


    # Tubes / Pipes (FIX validation)
    # elif item_group in ["Tubes", "Pipes"]:
    #     if od and wall and length:
    #         R = od / 2
    #         r = max(R - wall, 0)
    #         base_weight = (math.pi * (R**2 - r**2) * length * density) / 1_000_000
    
    elif item_group in ["Pipes", "Tubes"] or (item_group == "Forgings" and shape == "Hollow"):
        if od and wall and length:
            ID = od - (2 * wall)
            base_weight = (math.pi * ((od / 2) ** 2 - (ID / 2) ** 2) * length * density) / 1_000_000


    # Flanges / Rings
    elif item_group in ["Flanges", "Rings"]:
        if od and id_ and thickness:
            base_weight = (math.pi * ((od / 2) ** 2 - (id_ / 2) ** 2) * thickness * density) / 1_000_000

    # Forgings (FIXED ORDER)
    elif item_group == "Forgings":
        if shape == "N/A":
            return item

        # if shape == "Circle" and od and wall and length:
        #     R = od / 2
        #     r = max(R - wall, 0)
        #     base_weight = (math.pi * (R**2 - r**2) * length * density) / 1_000_000
        if shape == "Circle" and od and thickness:
            base_weight = (math.pi * (od / 2) ** 2 * thickness * density) / 1_000_000
            
    # Rods (FIXED)
    elif item_group == "Rods":
        if shape == "Circle" and od and length:
            base_weight = (math.pi * (od / 2) ** 2 * length * density) / 1_000_000

    if density:
         set_val("custom_kilogramskgs", flt(base_weight, 4))

    total_weight = flt(qty * base_weight, 4)
    set_val("custom_total_weight", total_weight)

    scrap_pct = get_val("custom_scrap_margin_percentage")
    scrap_kgs = total_weight * (scrap_pct / 100)
    set_val("custom_scrap_margin_kgs", flt(scrap_kgs, 4))

    transport_rate = get_val("custom_transportation_cost")
    transport_cost = total_weight * transport_rate
    set_val("custom_transportation_cost_kgs", flt(transport_cost, 2))

    return item


# =========================================================
# EXCEL UPLOAD METHOD
# =========================================================
@frappe.whitelist()
def upload_bom_excel(file_url):

    if not file_url:
        frappe.throw("File URL is missing")

    file_doc = frappe.get_doc("File", {"file_url": file_url})
    file_path = file_doc.get_full_path()

    wb = load_workbook(file_path)
    sheet = wb.active

    data = []
    headers = [cell.value for cell in sheet[1]]

    field_map = {
        "Item Code": "item_code",
        "Item Name": "item_name",
        "Item Group": "item_group",
        "Shape": "custom_shape",
        "Finished Goods Item": "fg_item",
        "Is Expandable": "is_expandable",
        "BOM Created": "bom_created",
        "Qty": "qty",
        "Rate": "rate",
        "UOM": "uom",
        "Parent Row No": "parent_row_no",

        "Part Number": "custom_part_number",
        "Length (mm)": "custom_length",
        "Width (mm)": "custom_width",
        "Thickness (mm)": "custom_thickness",
        "Density (kg/m³)": "custom_density",
        "Outer Diameter (mm)": "custom_outer_diameter",
        "Inner Diameter (mm)": "custom_inner_diameter",
        "Wall Thickness (mm)": "custom_wall_thickness",
        "Kgs Per Unit": "custom_kilogramskgs",
        "Total Weight": "custom_total_weight",
        "Scrap Margin (%)": "custom_scrap_margin_percentage",
        "Scrap Margin (Kg)": "custom_scrap_margin_kgs",
        "Transportation Cost (₹ / Kg)": "custom_transportation_cost",
        "Transportation Cost (₹)":"custom_transportation_cost_kgs",
        
    }

    for row in sheet.iter_rows(min_row=2, values_only=True):
        row_dict = dict(zip(headers, row))

        if not row_dict.get("Item Code"):
            continue

        child = {}

        for excel_field, frappe_field in field_map.items():
            value = row_dict.get(excel_field)

            if frappe_field in ["qty", "rate"]:
                value = value or 0

            if frappe_field in ["is_expandable", "bom_created"]:
                value = int(value) if value else 0

            if frappe_field.startswith("custom_") and value not in [None, ""]:
                try:
                    value = float(value)
                except:
                    pass

            child[frappe_field] = value

        # AUTO CALCULATION HERE
        child = calculate_values(child)
        data.append(child)
    return data

# =========================================================
# CUSTOM BOM CREATOR
# =========================================================

class CustomBOMCreator(BOMCreator):
    @frappe.whitelist()
    def process_item_selection(self, item_idx=None):
        pass
    
    def validate_duplicate_item(self):
        pass
    
    def validate(self):
        super().validate()

        # your calculations
        for item in self.items:
            calculate_values(item)

    def create_bom(self, row, production_item_wise_rm):

        bom_creator_item = row.name if row.name != self.name else ""

        if frappe.db.exists(
            "BOM",
            {
                "bom_creator": self.name,
                "item": row.item_code,
                "bom_creator_item": bom_creator_item,
                "docstatus": 1,
            },
        ):
            return

        bom = frappe.new_doc("BOM")

        bom.update({
            "item": row.item_code,
            "bom_type": "Production",
            "quantity": row.qty,
            "allow_alternative_item": 1,
            "bom_creator": self.name,
            "bom_creator_item": bom_creator_item,
            "is_phantom_bom": row.get("is_phantom_item"),
        })

        if row.item_code == self.item_code and (self.routing or self.has_operations()):
            bom.routing = self.routing
            bom.with_operations = 1
            bom.transfer_material_against = "Work Order"

        BOM_FIELDS = [
            "company",
            "rm_cost_as_per",
            "project",
            "currency",
            "conversion_rate",
            "buying_price_list",
        ]

        for field in BOM_FIELDS:
            if self.get(field):
                bom.set(field, self.get(field))

        for item in production_item_wise_rm[(row.item_code, row.name)]["items"]:

            # AUTO CALCULATION AGAIN (SAFETY)
            calculate_values(item)

            bom_no = ""
            item.do_not_explode = 1

            if (item.item_code, item.name) in production_item_wise_rm:
                bom_no = production_item_wise_rm.get(
                    (item.item_code, item.name)
                ).bom_no
                item.do_not_explode = 0

            item_args = {
                "item_code": item.item_code,
                "qty": item.qty,
                "uom": item.uom,
                "rate": item.rate,
                "stock_qty": item.stock_qty,
                "stock_uom": item.stock_uom,
                "conversion_factor": item.conversion_factor,
                "do_not_explode": item.do_not_explode,
                "operation": item.operation,
                "is_phantom_item": item.is_phantom_item,
            }

            CUSTOM_FIELDS = [
                "custom_part_number",
                "custom_shape",
                "custom_length",
                "custom_width",
                "custom_thickness",
                "custom_density",
                "custom_outer_diameter",
                "custom_inner_diameter",
                "custom_wall_thickness",
                "custom_kilogramskgs",
                "custom_total_weight",
                "custom_scrap_margin_percentage",
                "custom_scrap_margin_kgs",
                "custom_transportation_cost",
                "custom_transportation_cost_kgs",
            ]

            for field in CUSTOM_FIELDS:
                item_args[field] = item.get(field)

            item_args.update({
                "bom_no": bom_no,
                "allow_alternative_item": 1,
                "allow_scrap_items": not item.get("is_phantom_item"),
                "include_item_in_manufacturing": 1,
            })

            bom.append("items", item_args)

        bom.save(ignore_permissions=True)
        bom.submit()

        production_item_wise_rm[(row.item_code, row.name)].bom_no = bom.name

