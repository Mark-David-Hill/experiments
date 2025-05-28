import requests
from bs4 import BeautifulSoup

def get_x_coords(table_data):
    x_coords = []
    for row in table_data:
        x_coords.append(int(row[0]))
    return x_coords

def get_y_coords(table_data):
    y_coords = []
    for row in table_data:
        y_coords.append(int(row[2]))
    return y_coords

def initialize_nested_list(max_x, max_y):
    new_list = []

    for y_index in range(max_y):
        new_list.append([])

        for _ in range(max_x):
            new_list[y_index].append(" ")

    return new_list

def fetch_table_data(url): 
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')

    table = soup.find("table")
    table_data = []

    for row in table.find_all("tr"):
        row_data = [cell.get_text(strip=True) for cell in row.find_all(["td"])]
        table_data.append(row_data)

    del table_data[0]

    return table_data

def decode_message(url):
    table_data = fetch_table_data(url)

    x_coords = get_x_coords(table_data)
    y_coords = get_y_coords(table_data)

    max_x = max(x_coords) + 1
    max_y = max(y_coords) + 1

    message = initialize_nested_list(max_x, max_y)

    for row in table_data:
        x_coord = int(row[0])
        y_coord = -int(row[2])

        if y_coord == 0:
            message[max_y - 1][x_coord] = row[1]
        else:
            message[y_coord - 1][x_coord] = row[1]

    for row in message:
        current_row = "".join(row)
        print(current_row)
        
url = "https://docs.google.com/document/d/e/2PACX-1vQGUck9HIFCyezsrBSnmENk5ieJuYwpt7YHYEzeNJkIb9OSDdx-ov2nRNReKQyey-cwJOoEKUhLmN9z/pub"
decode_message(url)

# My decode_message function takes in a url, uses the imported "requests" library to fetch the data from the url and uses the imported "BeautifulSoup" library to convert the data from the table in the retrieved data (minus the header row) into a format that the rest of my code can work with. It then determines the max length on the x-axis and the max length on the y-axis based on the values from the table and initializes a nested list of lists, called the "message", where each sub-list has its values initialized as empty spaces. From here it iterates through the rows in the table data and sets the values of specific coordinates of the message list. The trickiest part here is that the coordinates (0, 0) correspond with the bottom left corner of the message rather than the top left, so when iterating through the table data and setting up the message in the order it should be printed in it sets the y coordinates for where it is writing the data to to be either the negative value of the y coordinate or the end of the list if the y coordinate is 0 so that it will put it in reverse row order. It then iterates through each row of the message list, combines the characters of each row into a single string, and prints each string in order.