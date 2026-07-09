# Step 1: Use an official Node.js runtime as the base image
FROM node:18-alpine

# Step 2: Set the working directory inside the container
WORKDIR /app

# Step 3: Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Step 4: Install dependencies inside the container
RUN npm install

# Step 5: Copy the rest of your backend source code
COPY . .

# Step 6: Build your TypeScript code (if applicable)
# If you are using raw JS, you can remove or comment out this next line
RUN npm run build

# Step 7: Expose the port your poker backend runs on (usually 3001)
EXPOSE 3001

# Step 8: Define the command to run your app
CMD ["npm", "start"]
