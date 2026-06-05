import sys
from rembg import remove
from PIL import Image

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python remove_bg.py <input_path> <output_path>")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        input_image = Image.open(input_path)
        output_image = remove(input_image)
        output_image.save(output_path, 'PNG')
        print(output_path)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)