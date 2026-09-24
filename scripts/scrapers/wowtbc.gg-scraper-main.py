from bs4 import BeautifulSoup

# 1. Load the downloaded HTML file
# (Replace 'recipes.html' with the actual filename of your downloaded file)
with open("tailoring.html", "r", encoding="utf-8") as file:
  html_content = file.read()

# 2. Parse the HTML
soup = BeautifulSoup(html_content, "html.parser")

# 3. Find all recipe rows in the table body
recipe_rows = soup.find_all("tr", class_="recipe__forever")

parsed_recipes = []

for row in recipe_rows:
  # Extract Recipe Name
  name_element = row.find("span", class_="database__item__name")
  # Clean up text by removing nested tags like '<span class="forever__new">new</span>' if present
  if name_element:
    # Get direct text or clone and extract
    for new_tag in name_element.find_all("span", class_="forever__new"):
      new_tag.decompose()
    recipe_name = name_element.get_text(strip=True)
  else:
    recipe_name = "Unknown"

  # Extract Rank
  rank = row.find(
      "td", class_="recipe__forever__rank"
  ).get_text(  # Note: <td> shares the class name, adjust if needed
      strip=True
  )

  # Extract Materials (Reagents & Counts)
  reagents = []
  reagent_spans = row.find_all("span", class_="recipe__forever__reagent")
  for reagent in reagent_spans:
    img = reagent.find("img", class_="recipe__forever__reagent__icon")
    item_name = img.get("alt") if img else "Unknown"
    count = reagent.find(
        "span", class_="recipe__forever__reagent__count"
    ).get_text(strip=True)
    reagents.append(f"{count}x {item_name}")

  # Extract Source (Trainer, Recipe, etc.)
  source = row.find("td", class_="recipe__forever__source").get_text(strip=True)

  # Extract Skill Levels (Orange, Yellow, Green, Grey)
  skills_container = row.find("td", class_="recipe__forever__skill")
  skill_spans = skills_container.find_all("span") if skills_container else []
  skills = [span.get_text(strip=True) for span in skill_spans]
  # Typically formatted as [Orange, Yellow, Green, Grey]
  skill_dict = {
      "orange": skills[0] if len(skills) > 0 else None,
      "yellow": skills[1] if len(skills) > 1 else None,
      "green": skills[2] if len(skills) > 2 else None,
      "grey": skills[3] if len(skills) > 3 else None,
  }

  # Store the structured data
  parsed_recipes.append({
      "rank": rank,
      "name": recipe_name,
      "reagents": reagents,
      "source": source,
      "skills": skill_dict,
  })

# 4. Print the results to verify
import json

print(json.dumps(parsed_recipes, indent=2))