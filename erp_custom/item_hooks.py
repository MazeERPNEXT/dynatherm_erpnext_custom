# import frappe

# def calculate_kilograms(doc, method):
#     if doc.length and doc.width and doc.thickness:
#         try:
#             doc.kilograms = float(doc.length) * float(doc.width) * float(doc.thickness)
#         except Exception as e:
#             frappe.throw(f"Error calculating kilograms: {e}")
#     else:
#         doc.kilograms = 0
