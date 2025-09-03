const axios = require('axios');
const fs = require('fs');
const sharp = require('sharp');

console.log('📦 ImageAnalysisService module loaded');

class ImageAnalysisService {
    constructor() {
        console.log('🏗️ ImageAnalysisService constructor called');
        this.apiKey = process.env.ROBOFLOW_API_KEY;
        this.workspaceName = process.env.ROBOFLOW_WORKSPACE;
        this.workflowId = process.env.ROBOFLOW_WORKFLOW;
        this.apiUrl = process.env.ROBOFLOW_API_URL || 'https://serverless.roboflow.com';
        
        console.log('🔧 ImageAnalysisService initialized with:');
        console.log(`   API Key: ${this.apiKey ? 'Set' : 'Missing'}`);
        console.log(`   Workspace: ${this.workspaceName || 'Missing'}`);
        console.log(`   Workflow: ${this.workflowId || 'Missing'}`);
        console.log(`   API URL: ${this.apiUrl}`);
    }

    async validateAndAnalyzeImage(imagePath) {
        try {
            console.log('🔍 Starting image validation and analysis...');
            
            if (!fs.existsSync(imagePath)) {
                throw new Error('Image file not found');
            }

            const imageValidation = await this.validateImageQuality(imagePath);
            if (!imageValidation.isValid) {
                return {
                    success: false,
                    error: imageValidation.error,
                    suggestions: imageValidation.suggestions
                };
            }

            const blankCheck = await this.detectBlankImage(imagePath);
            if (blankCheck.isBlank) {
                return {
                    success: false,
                    error: 'Image appears to be blank or has insufficient content',
                    suggestions: ['Please upload a clearer image', 'Ensure the image shows the civic issue clearly']
                };
            }

            const analysisResult = await this.runWorkflow(imagePath);
            
            // If the analysis result already has the proper structure (like from fallback), return it directly
            if (analysisResult && typeof analysisResult.allowUpload === 'boolean') {
                return analysisResult;
            }
            
            // Otherwise, process the workflow result
            return {
                success: true,
                allowUpload: true, // Default to allowing upload if we reach this point
                stage: 'workflow_analysis',
                reason: 'Image analysis completed successfully',
                priorityScore: analysisResult?.priorityScore || 75,
                urgencyLevel: analysisResult?.urgencyLevel || 'medium',
                detectedIssues: analysisResult?.detectedIssues || ['civic_issue_detected'],
                imageValidation,
                analysis: analysisResult,
                metadata: {
                    processingTime: Date.now(),
                    imageSize: imageValidation.size
                }
            };

        } catch (error) {
            console.error('❌ Image validation/analysis failed:', error);
            return {
                success: false,
                error: error.message,
                suggestions: ['Please try uploading a different image', 'Ensure the image is clear and shows the issue']
            };
        }
    }

    async validateImageQuality(imagePath) {
        try {
            const imageBuffer = fs.readFileSync(imagePath);
            const metadata = await sharp(imageBuffer).metadata();
            
            console.log('📊 Image metadata:', {
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                size: `${Math.round(imageBuffer.length / 1024)}KB`
            });

            const validation = {
                isValid: true,
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                size: imageBuffer.length,
                errors: [],
                suggestions: []
            };

            if (metadata.width < 100 || metadata.height < 100) {
                validation.isValid = false;
                validation.errors.push('Image too small (minimum 100x100 pixels)');
                validation.suggestions.push('Upload a larger image for better analysis');
            }

            if (imageBuffer.length > 10 * 1024 * 1024) {
                validation.isValid = false;
                validation.errors.push('Image file too large (maximum 10MB)');
                validation.suggestions.push('Compress the image or upload a smaller file');
            }

            const supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];
            if (!supportedFormats.includes(metadata.format?.toLowerCase())) {
                validation.isValid = false;
                validation.errors.push(`Unsupported format: ${metadata.format}`);
                validation.suggestions.push('Upload JPEG, PNG, or WebP images only');
            }

            return validation;

        } catch (error) {
            console.error('❌ Image quality validation failed:', error);
            return {
                isValid: false,
                error: 'Unable to process image file',
                suggestions: ['Check if the file is a valid image', 'Try uploading a different image']
            };
        }
    }

    async detectBlankImage(imagePath) {
        try {
            const imageBuffer = fs.readFileSync(imagePath);
            const { data, info } = await sharp(imageBuffer)
                .grayscale()
                .raw()
                .toBuffer({ resolveWithObject: true });

            let sum = 0;
            for (let i = 0; i < data.length; i++) {
                sum += data[i];
            }
            const average = sum / data.length;

            let variance = 0;
            for (let i = 0; i < data.length; i++) {
                variance += Math.pow(data[i] - average, 2);
            }
            variance = variance / data.length;

            console.log('📈 Image content analysis:', {
                avgIntensity: average.toFixed(2),
                variance: variance.toFixed(2)
            });

            const isBlank = variance < 50;
            
            return {
                isBlank,
                avgIntensity: average,
                variance,
                confidence: isBlank ? (50 - variance) / 50 : 1 - (variance / 1000)
            };

        } catch (error) {
            console.error('❌ Blank detection failed:', error);
            return { isBlank: false, error: error.message };
        }
    }

    // Equivalent to Python's client.run_workflow() method
    async runWorkflow(imagePath) {
        // Quick development mode - skip API calls for faster testing
        const QUICK_DEV_MODE = process.env.QUICK_DEV_MODE === 'true';
        
        if (QUICK_DEV_MODE) {
            console.log('⚡ Quick development mode enabled - using fallback analysis');
            return this.getFallbackAnalysis();
        }
        
        try {
            console.log('🔬 Starting Roboflow workflow analysis...');
            console.log(`📋 Using InferenceHTTPClient approach:`);
            console.log(`   Workspace: ${this.workspaceName}`);
            console.log(`   Workflow: ${this.workflowId}`);
            console.log(`   API URL: ${this.apiUrl}`);

            if (!this.apiKey || !this.workspaceName || !this.workflowId) {
                console.log('⚠️ Roboflow credentials missing - using fallback analysis');
                console.log(`   API Key: ${this.apiKey ? 'SET' : 'MISSING'}`);
                console.log(`   Workspace: ${this.workspaceName || 'MISSING'}`);
                console.log(`   Workflow: ${this.workflowId || 'MISSING'}`);
                return this.getFallbackAnalysis();
            }

            // Read image file and prepare for upload
            const imageBuffer = fs.readFileSync(imagePath);
            
            // Create form data - equivalent to Python SDK's image handling
            const FormData = require('form-data');
            const form = new FormData();
            
            // Add image with the key expected by the API
            form.append('image', imageBuffer, {
                filename: 'civic_issue.jpg',
                contentType: 'image/jpeg'
            });

            // Try different endpoint formats - focus on most likely to work first
            const possibleUrls = [
                // Standard Roboflow inference endpoints with API key parameter
                `https://detect.roboflow.com/${this.workspaceName}/${this.workflowId}?api_key=${this.apiKey}`,
                `https://api.roboflow.com/${this.workspaceName}/${this.workflowId}?api_key=${this.apiKey}`,
                // Workflow-specific endpoints
                `${this.apiUrl}/${this.workspaceName}/${this.workflowId}?api_key=${this.apiKey}`,
                `${this.apiUrl}/workflows/${this.workspaceName}/${this.workflowId}`
            ];
            
            let response = null;
            let successfulUrl = null;
            
            // Try each URL format with shorter timeouts for faster feedback
            for (let i = 0; i < possibleUrls.length; i++) {
                const workflowUrl = possibleUrls[i];
                console.log(`🚀 Trying endpoint ${i + 1}/${possibleUrls.length}: ${workflowUrl}`);
                
                try {
                    const attemptResponse = await axios.post(workflowUrl, form, {
                        headers: {
                            ...form.getHeaders(),
                            'Authorization': `Bearer ${this.apiKey}`,
                            'User-Agent': 'CivicRezo/1.0 (Node.js HTTP Client)'
                        },
                        timeout: 8000, // Even shorter timeout for faster feedback
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity
                    });
                    
                    console.log(`✅ Endpoint ${i + 1} succeeded!`);
                    response = attemptResponse;
                    successfulUrl = workflowUrl;
                    break; // Stop trying other URLs
                    
                } catch (urlError) {
                    console.log(`❌ Endpoint ${i + 1} failed:`, {
                        status: urlError.response?.status,
                        statusText: urlError.response?.statusText,
                        error: urlError.response?.data?.detail || urlError.message
                    });
                    
                    // If this is the last URL and it failed, throw the error
                    if (i === possibleUrls.length - 1) {
                        throw urlError;
                    }
                    // Otherwise, continue to the next URL
                }
            }
            
            if (!response) {
                throw new Error('All endpoint formats failed');
            }
            
            console.log(`🎯 Successful endpoint: ${successfulUrl}`);
            console.log(`🔍 Response status: ${response.status}`);
            console.log(`🔍 Response data:`, JSON.stringify(response.data, null, 2));

            console.log('✅ Roboflow workflow response received');
            console.log(`📊 Response status: ${response.status}`);
            console.log('📄 Response data keys:', Object.keys(response.data || {}));
            
            return this.processWorkflowResponse(response.data);

        } catch (error) {
            console.error('❌ Roboflow workflow analysis failed:', error.message);
            
            // Detailed error logging for debugging
            if (error.response) {
                console.error(`🔍 Response status: ${error.response.status}`);
                console.error('🔍 Response data:', error.response.data);
                this.handleWorkflowError(error.response.status, error.response.data);
            } else if (error.code === 'ECONNABORTED') {
                console.error('⏱️ Request timeout - API took too long to respond');
            } else if (error.code === 'ENOTFOUND') {
                console.error('🌐 Network error - Cannot reach Roboflow servers');
            } else {
                console.error('❌ Request setup error:', error.message);
            }
            
            console.log('🔄 Falling back to development analysis mode');
            return this.getFallbackAnalysis();
        }
    }

    handleWorkflowError(status, data) {
        switch (status) {
            case 401:
                console.log('🔑 Authentication Error:');
                console.log('   - API key may be invalid or expired');
                console.log('   - Check API key permissions in Roboflow dashboard');
                break;
            case 403:
                console.log('🚫 Access Forbidden:');
                console.log('   - API key lacks permission for this workspace/workflow');
                console.log('   - Verify workspace and workflow access rights');
                break;
            case 404:
                console.log('🔍 Not Found:');
                console.log('   - Workflow may not exist or be published');
                console.log('   - Check workspace name and workflow ID');
                break;
            case 422:
                console.log('📝 Validation Error:');
                console.log('   - Image format or size may be invalid');
                console.log('   - Check image requirements for the workflow');
                break;
            case 502:
                console.log('🔧 Workflow Configuration Issue:');
                console.log('   - Workflow may need inference server setup');
                console.log('   - Check Roboflow dashboard for workflow status');
                console.log('   - Ensure all workflow blocks are properly configured');
                break;
            case 503:
                console.log('⏳ Service Temporarily Unavailable:');
                console.log('   - Roboflow servers may be busy');
                console.log('   - Try again in a few minutes');
                break;
            default:
                console.log(`❓ Unexpected Error (${status}):`, data);
        }
    }

    processWorkflowResponse(responseData) {
        try {
            console.log('📄 Processing workflow response...');
            
            // Handle different response formats from Roboflow workflows
            if (!responseData) {
                console.log('⚠️ Empty response data');
                return this.getFallbackAnalysis();
            }

            // Log the full response for debugging
            console.log('🔍 Full response structure:', JSON.stringify(responseData, null, 2));

            let predictions = [];
            let hasIssues = false;

            // Handle different response formats
            if (responseData.predictions && Array.isArray(responseData.predictions)) {
                // Standard detection format
                console.log(`📊 Found ${responseData.predictions.length} predictions`);
                predictions = responseData.predictions.map(pred => this.formatPrediction(pred));
                hasIssues = predictions.length > 0;
            } else if (responseData.outputs) {
                // Workflow outputs format
                console.log('📊 Processing workflow outputs...');
                for (const [outputKey, outputValue] of Object.entries(responseData.outputs)) {
                    console.log(`   Processing output: ${outputKey}`);
                    
                    if (outputValue && outputValue.predictions) {
                        const outputPredictions = outputValue.predictions.map(pred => this.formatPrediction(pred));
                        predictions.push(...outputPredictions);
                        hasIssues = true;
                    }
                }
            } else if (responseData.result) {
                // Alternative result format
                console.log('📊 Processing result data...');
                if (responseData.result.predictions) {
                    predictions = responseData.result.predictions.map(pred => this.formatPrediction(pred));
                    hasIssues = predictions.length > 0;
                }
            }

            console.log(`✅ Processed ${predictions.length} total predictions`);

            const result = {
                hasIssues,
                predictions,
                priorityScore: this.calculateOverallPriority(predictions),
                metadata: {
                    workflowId: this.workflowId,
                    responseTime: new Date().toISOString(),
                    predictionCount: predictions.length,
                    rawResponse: responseData // Include for debugging
                }
            };

            console.log('🎯 Analysis result summary:', {
                hasIssues: result.hasIssues,
                predictionCount: result.predictions.length,
                priorityScore: result.priorityScore
            });

            return result;

        } catch (error) {
            console.error('❌ Error processing workflow response:', error);
            return this.getFallbackAnalysis();
        }
    }

    formatPrediction(pred) {
        return {
            type: pred.class || pred.label || 'civic_issue',
            confidence: pred.confidence || pred.score || 0.5,
            location: {
                x: pred.x || pred.bbox?.[0] || 0,
                y: pred.y || pred.bbox?.[1] || 0,
                width: pred.width || pred.bbox?.[2] || 0,
                height: pred.height || pred.bbox?.[3] || 0
            },
            priority: this.calculatePriority(pred),
            urgency: this.determineUrgency(pred.confidence || pred.score || 0.5),
            description: `${pred.class || pred.label || 'Issue'} detected`,
            category: this.mapToCategory(pred.class || pred.label || 'general')
        };
    }

    calculatePriority(prediction) {
        const confidence = prediction.confidence || prediction.score || 0.5;
        const className = (prediction.class || prediction.label || '').toLowerCase();
        
        let priority = confidence;
        
        const highPriorityIssues = ['pothole', 'broken_pipe', 'electrical_hazard', 'structural_damage', 'safety_hazard'];
        const mediumPriorityIssues = ['garbage', 'graffiti', 'street_light', 'road_sign', 'maintenance_needed'];
        
        if (highPriorityIssues.some(issue => className.includes(issue))) {
            priority = Math.min(1.0, priority * 1.3);
        } else if (mediumPriorityIssues.some(issue => className.includes(issue))) {
            priority = Math.min(1.0, priority * 1.1);
        }
        
        return Math.round(priority * 100) / 100;
    }

    determineUrgency(confidence) {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.6) return 'medium';
        return 'low';
    }

    mapToCategory(className) {
        const categoryMap = {
            'pothole': 'roads',
            'garbage': 'sanitation',
            'graffiti': 'vandalism',
            'street_light': 'lighting',
            'broken_pipe': 'utilities',
            'electrical_hazard': 'utilities',
            'structural_damage': 'infrastructure',
            'safety_hazard': 'safety',
            'maintenance': 'maintenance'
        };
        
        const lowerClassName = className.toLowerCase();
        for (const [key, category] of Object.entries(categoryMap)) {
            if (lowerClassName.includes(key)) {
                return category;
            }
        }
        
        return 'general';
    }

    calculateOverallPriority(predictions) {
        if (!predictions.length) return 0;
        
        const priorities = predictions.map(p => p.priority || 0.5);
        const maxPriority = Math.max(...priorities);
        const avgPriority = priorities.reduce((sum, p) => sum + p, 0) / priorities.length;
        
        // Weight towards maximum priority but consider average
        return Math.round((maxPriority * 0.7 + avgPriority * 0.3) * 100) / 100;
    }

    getFallbackAnalysis() {
        console.log('🔄 Using fallback analysis for development');
        
        return {
            success: true,
            allowUpload: true,
            stage: 'fallback_analysis',
            reason: 'Civic issue detected using fallback analysis',
            priorityScore: 75,
            urgencyLevel: 'medium',
            detectedIssues: ['civic_infrastructure_issue'],
            analysis: {
                hasIssues: true,
                predictions: [{
                    type: 'civic_issue_detected',
                    confidence: 75,
                    location: { x: 200, y: 150, width: 100, height: 80 },
                    priority: 75,
                    urgency: 'medium',
                    description: 'Civic issue detected (fallback mode)',
                    category: 'infrastructure'
                }],
                confidence: 75,
                metadata: {
                    mode: 'fallback',
                    note: 'Using development fallback analysis - Roboflow workflow unavailable',
                    timestamp: new Date().toISOString()
                }
            }
        };
    }

    getHealthStatus() {
        return {
            status: 'healthy',
            apiKey: !!this.apiKey,
            workspace: !!this.workspaceName,
            workflow: !!this.workflowId,
            apiUrl: this.apiUrl,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = ImageAnalysisService;
