# Phrase Cloud App

This is a static HTML web app that generates a Phrase Cloud from a text file. All processing is done locally.

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
This will start the webpack dev server at https://localhost:8080. The server supports hot module replacement and will watch your HTML files for changes.

To create a production build, run:
```bash
npm run build
```
This will create a dist directory with your minified project assets.
