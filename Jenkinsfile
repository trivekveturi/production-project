pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        AWS_REGION   = 'ap-south-1'
        ECR_REGISTRY = '123456789012.dkr.ecr.ap-south-1.amazonaws.com'  // TODO: your AWS account ID
        IMAGE_NAME   = 'production-project'
        IMAGE_TAG    = "${env.BUILD_NUMBER}"
        EKS_CLUSTER  = 'production-eks'
        K8S_NAMESPACE = 'production'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install & Test') {
            agent {
                docker { image 'node:20-alpine' }
            }
            steps {
                sh 'npm ci'
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker build -t ${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} \
                                 -t ${ECR_REGISTRY}/${IMAGE_NAME}:latest .
                '''
            }
        }

        stage('Push to ECR') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                  credentialsId: 'aws-credentials']]) {
                    sh '''
                        aws ecr get-login-password --region ${AWS_REGION} | \
                          docker login --username AWS --password-stdin ${ECR_REGISTRY}
                        docker push ${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                        docker push ${ECR_REGISTRY}/${IMAGE_NAME}:latest
                    '''
                }
            }
        }

        stage('Deploy to EKS') {
            when { branch 'main' }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                  credentialsId: 'aws-credentials']]) {
                    sh '''
                        aws eks update-kubeconfig --name ${EKS_CLUSTER} --region ${AWS_REGION}
                        kubectl apply -f k8s/namespace.yaml
                        kubectl apply -f k8s/service.yaml -f k8s/ingress.yaml -f k8s/hpa.yaml
                        sed "s|IMAGE_PLACEHOLDER|${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}|g" k8s/deployment.yaml | kubectl apply -f -
                        kubectl rollout status deployment/production-app -n ${K8S_NAMESPACE} --timeout=180s
                    '''
                }
            }
        }
    }

    post {
        success { echo "Build ${env.BUILD_NUMBER} deployed successfully" }
        failure { echo "Build ${env.BUILD_NUMBER} failed" }
        always  { sh 'docker image prune -f || true' }
    }
}
