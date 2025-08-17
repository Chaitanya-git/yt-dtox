#!/usr/bin/env python3
"""
Simple script to create placeholder icons for the extension
Creates basic colored squares with the extension logo/emoji
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    """Create a simple icon with the specified size"""
    # Create image with red background
    img = Image.new('RGB', (size, size), color='#FF0000')
    draw = ImageDraw.Draw(img)
    
    # Try to use a system font, fall back to default if not available
    try:
        # Calculate font size based on icon size
        font_size = max(size // 3, 12)
        font = ImageFont.truetype('/usr/share/fonts/TTF/arial.ttf', font_size)
    except:
        try:
            font = ImageFont.load_default()
        except:
            font = None
    
    # Draw target emoji/symbol in white
    text = "🎯"
    if font:
        # Get text dimensions
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Center the text
        x = (size - text_width) // 2
        y = (size - text_height) // 2
        
        draw.text((x, y), text, fill='white', font=font)
    else:
        # Fallback: draw a simple white circle
        margin = size // 4
        draw.ellipse([margin, margin, size-margin, size-margin], fill='white')
    
    # Save the image
    img.save(output_path, 'PNG')
    print(f"Created icon: {output_path}")

def main():
    """Create all required icon sizes"""
    icons_dir = '/home/chaitanya/Development/yt-dtox/icons'
    
    # Ensure icons directory exists
    os.makedirs(icons_dir, exist_ok=True)
    
    # Create icons in required sizes
    sizes = [16, 32, 48, 128]
    
    for size in sizes:
        output_path = os.path.join(icons_dir, f'icon-{size}.png')
        create_icon(size, output_path)
    
    print("All icons created successfully!")

if __name__ == '__main__':
    main()