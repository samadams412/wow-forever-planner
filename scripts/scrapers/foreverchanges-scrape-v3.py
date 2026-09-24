from bs4 import BeautifulSoup

def parse_profession_html(file_path):
    # Read the local HTML file
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            html_content = file.read()
    except FileNotFoundError:
        print(f"Error: The file '{file_path}' was not found.")
        return

    soup = BeautifulSoup(html_content, 'html.parser')

    print("=== LEVELING SECTION ===")
    leveling_section = soup.find(id='leveling')
    if leveling_section:
        current_rank = "Unknown Rank"
        
        # Iterate through the elements to track ranks and steps
        for element in leveling_section.find_all(['li', 'div']): # depending on structure, usually children of leveling
            if 'en3-lv-rank' in element.get('class', []):
                current_rank = element.get_text(strip=True)
                print(f"\n--- Rank: {current_rank} ---")
            
            elif 'en3-lv-step' in element.get('class', []):
                # Extract Level Range
                range_tag = element.find('span', class_='en3-lv-range')
                level_range = range_tag.find('b').get_text(strip=True) if range_tag and range_tag.find('b') else "N/A"
                
                # Extract Skill Threshold (e.g., color-coded skill point requirement if present, or fallback data attribute)
                threshold_tag = element.find(class_=lambda x: x and 'threshold' in x) # Adjust class identifier if your specific layout uses a different naming convention
                skill_threshold = "N/A"
                if threshold_tag:
                    skill_threshold = threshold_tag.get_text(strip=True)
                elif range_tag and range_tag.has_attr('data-skill'):
                    skill_threshold = range_tag.get('data-skill')

                # Extract Crafted Item & Source/Location
                what_tag = element.find('span', class_='en3-lv-what')
                item_name = "N/A"
                item_href = "N/A"
                learned_from = "N/A"
                if what_tag:
                    a_tag = what_tag.find('a', class_='en3-lv-made')
                    if a_tag:
                        item_href = a_tag.get('href', 'N/A')
                        
                        # Check for quality spans (e.g., q1, q2, q3, etc.) inside the anchor tag
                        name_span = a_tag.find(class_=lambda x: x and x.startswith('q'))
                        if name_span:
                            item_name = name_span.get_text(strip=True)
                        else:
                            item_name = a_tag.get_text(strip=True)
                            
                    small_tag = what_tag.find('small')
                    if small_tag:
                        learned_from = small_tag.get_text(strip=True)
                
                # Extract Craft Count
                count_tag = element.find('span', class_='en3-lv-count')
                craft_count = count_tag.get_text(strip=True) if count_tag else "N/A"
                
                # Extract Materials
                mats = []
                for mat_tag in element.find_all('span', class_='cr-mats'):
                    mat_a = mat_tag.find('a', class_='cr-mat')
                    if mat_a:
                        mat_name = mat_a.get('aria-label', 'Unknown Material')
                        mat_href = mat_a.get('href', 'N/A')
                        mats.append(f"{mat_name} (ID/Link: {mat_href})")

                print(f"  [Step] Range: {level_range} | Threshold: {skill_threshold} | Item: {item_name} ({item_href}) | Source: {learned_from} | Count: {craft_count} | Mats: {', '.join(mats)}")
    else:
        print("Leveling section with id 'leveling' not found.")

    print("\n=== FAVOR SECTION ===")
    favor_section = soup.find(id='favor')
    if favor_section:
        tiers = favor_section.find_all('div', class_='en3-tier')
        for tier in tiers:
            h3_tag = tier.find('h3', class_='en3-h3')
            tier_title = "Unknown Tier"
            skill_range = "N/A"
            if h3_tag:
                # Extract text up to the small tag for the title
                tier_title = h3_tag.contents[0].strip() if h3_tag.contents else "Unknown Tier"
                small_tag = h3_tag.find('small')
                if small_tag:
                    skill_range = small_tag.get_text(strip=True)

            print(f"\n--- Tier: {tier_title} ({skill_range}) ---")
            
            crafted_ul = tier.find('ul', class_='en3-crafted')
            if crafted_ul:
                for li in crafted_ul.find_all('li'):
                    item_a = li.find('a')
                    if item_a:
                        item_name = item_a.get_text(strip=True)
                        item_href = item_a.get('href', 'N/A')
                        print(f"  [Craft] Item: {item_name} ({item_href})")
    else:
        print("Favor section with id 'favor' not found.")

if __name__ == "__main__":
    # Example usage: replace with your actual file path
    parse_profession_html("enchanting2.html")