# CivicStack Development Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a full-stack civic complaint management system with React Native frontend, Node.js backend, and Supabase database.

## Development Guidelines

### Code Style
- Use ES6+ features and async/await for asynchronous operations
- Follow React Native best practices for mobile development
- Use functional components with hooks
- Implement proper error handling and user feedback
- Use consistent naming conventions (camelCase for variables, PascalCase for components)

### Architecture Patterns
- Frontend: Component-based architecture with proper state management
- Backend: RESTful API design with middleware pattern
- Database: Normalized schema with proper relationships and indexes

### Security Considerations
- Always validate user inputs on both frontend and backend
- Use JWT tokens for authentication
- Implement proper error handling without exposing sensitive information
- Use environment variables for sensitive configuration

### UI/UX Guidelines
- Follow Material Design principles for Android and iOS Human Interface Guidelines
- Ensure accessibility compliance
- Use consistent color scheme and typography
- Implement proper loading states and error messages
- Design for both portrait and landscape orientations

### API Development
- Use proper HTTP status codes
- Implement consistent error response format
- Add request validation middleware
- Include proper documentation comments
- Use pagination for list endpoints

### Database Best Practices
- Use proper indexes for query optimization
- Implement Row Level Security (RLS) policies
- Use transactions for complex operations
- Regular backup and migration strategies

### Testing Strategy
- Write unit tests for utility functions
- Implement integration tests for API endpoints
- Add end-to-end tests for critical user flows
- Use React Native Testing Library for component tests

### Future AI Integration
- Prepare data structures for AI model integration
- Consider scalability for image processing workflows
- Plan for real-time analytics and reporting features
- Design for multilingual content management
