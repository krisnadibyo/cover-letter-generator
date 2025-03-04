# Cover Letter Generator

This application helps you generate tailored cover letters based on your CV, job descriptions, and company profiles using the DeepSeek AI API.

## Installation and Setup

Follow these steps to set up and run the application:

### 1. Clone the Repository

```bash
git clone <repository-url>
cd cover-letter-generator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory with the following content:

```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

To get a DeepSeek API key:

1. Sign up at [DeepSeek's website](https://deepseek.com)
2. Navigate to your account settings or API section
3. Generate a new API key
4. Copy the key and paste it in your `.env.local` file

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Using the Application

1. Fill in the job description from the posting you're applying to
2. Add information about the company (culture, values, mission)
3. Upload your CV/resume as a PDF file (max 5MB)
4. Set your preferred maximum word count for the cover letter
5. Click "Generate Cover Letter"
6. Wait for the AI to analyze your CV and generate a tailored cover letter
7. Copy or download the generated cover letter

## Troubleshooting

- **API Key Issues**: Ensure your DeepSeek API key is valid and correctly set in the `.env.local` file
- **File Upload Problems**: Make sure your CV is in PDF format and under 5MB
- **Generation Errors**: Check the console logs for detailed error messages

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.