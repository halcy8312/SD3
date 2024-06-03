body {
    font-family: Arial, sans-serif;
    background-color: #f4f4f4;
    margin: 0;
    padding: 20px;
}

.navbar {
    overflow: hidden;
    background-color: #333;
    position: relative;
}

.menu-icon {
    font-size: 30px;
    cursor: pointer;
    color: white;
    padding: 14px 16px;
    display: inline-block;
}

.navbar .dropdown-content {
    display: none;
    position: absolute;
    background-color: #f9f9f9;
    min-width: 160px;
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
    z-index: 1;
    top: 50px;
}

.navbar .dropdown-content.show {
    display: block;
}

.navbar .dropdown-content a {
    float: none;
    color: black;
    padding: 12px 16px;
    text-decoration: none;
    display: block;
    text-align: left;
}

.navbar .dropdown-content a:hover {
    background-color: #ddd;
}

.content {
    max-width: 800px;
    margin: 0 auto;
    background: #fff;
    padding: 20px;
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.form-group {
    margin-bottom: 15px;
}

label {
    display: block;
    margin-bottom: 5px;
}

input[type="text"],
textarea,
select,
input[type="file"] {
    width: 100%;
    padding: 10px;
    margin-bottom: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

button.generate-button {
    background: #007bff;
    color: #fff;
    border: none;
    padding: 10px 15px;
    cursor: pointer;
    float: right;
}

button.generate-button:hover {
    background: #0056b3;
}
