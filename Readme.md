# Phrase Cloud App

This is a static HTML web app that generates a Phrase Cloud from some text.


## Features

- Supports plain text: each paragraph is treated as an individual block.
- Supports CSV files: each cell is treated as an individual block, and you can select which column to generate a cloud from.
- Export to SVG: only works well for generic font families, e.g. 'sans-serif'.
- Drag and drop or paste directly: works for both text and files.



## Prerequisites

You need to have Node.js and npm installed on your machine. You can download Node.js [here](https://nodejs.org/en/download/) and npm is included in the installation.

## Installation

1. Clone the repository and install dependencies:
```bash
git clone https://github.com/amarax/phrasecloud.git
cd phrasecloud
npm install
```

## Usage
To start the development server, run:
```bash
npm start
```
This will start the webpack dev server at https://localhost:8080. The server supports hot module replacement, and has been configured to work with the worker as well.

To create a production build, run:
```bash
npm run build
```
This will create a dist directory with your minified project assets.
