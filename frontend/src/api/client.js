import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
  }
  return 'http://localhost:8000/api';
};

export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

export const uploadDataset = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const baseUrl = getApiBaseUrl();
  const response = await axios.post(`${baseUrl}/upload`, formData);
  return response.data;
};

export const loadBenchmarkData = async () => {
  const response = await apiClient.post('/sample-data');
  return response.data;
};

export const runFairnessAnalysis = async (payload) => {
  const response = await apiClient.post('/analyze', payload);
  return response.data;
};

export const getReportHtmlUrl = (analysisId) => `${getApiBaseUrl()}/report/html/${analysisId}`;
export const getReportPdfUrl = (analysisId) => `${getApiBaseUrl()}/report/pdf/${analysisId}`;

export const fetchDefaultHmdaAnalysis = async (modelType = 'baseline') => {
  const response = await apiClient.get(`/hmda-analysis?model_type=${modelType}`);
  return response.data;
};

export const fetchDefaultAdultAnalysis = fetchDefaultHmdaAnalysis;

export const fetchTestSummary = async () => {
  const response = await apiClient.get('/prediction/test-summary');
  return response.data;
};

export const fetchTestQueue = async (filterType = 'discrepancies') => {
  const response = await apiClient.get(`/prediction/test-queue?filter_type=${filterType}`);
  return response.data;
};

export const fetchTestRecordDetail = async (recordId) => {
  const response = await apiClient.get(`/prediction/test-record/${recordId}`);
  return response.data;
};

export const predictNewApplicant = async (payload) => {
  const response = await apiClient.post('/prediction/predict-new', payload);
  return response.data;
};

export const submitHumanValidation = async (payload) => {
  const response = await apiClient.post('/prediction/submit-validation', payload);
  return response.data;
};



