import { 
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { AWS_CONFIG, COGNITO_CONFIG } from "../config";
import CryptoJS from 'crypto-js';

const cognitoClient = new CognitoIdentityProviderClient({
  region: AWS_CONFIG.region,
  credentials: {
    accessKeyId: AWS_CONFIG.credentials.accessKeyId || '',
    secretAccessKey: AWS_CONFIG.credentials.secretAccessKey || '',
  },
});

function calculateSecretHash(username: string): string {
  const message = username + COGNITO_CONFIG.clientId;
  const secret = COGNITO_CONFIG.clientSecret || '';
  return CryptoJS.enc.Base64.stringify(
    CryptoJS.HmacSHA256(
      message,
      CryptoJS.enc.Utf8.parse(secret)
    )
  );
}

export async function signUp(username: string, password: string, email: string) {
  const secretHash = calculateSecretHash(username);
  const command = new SignUpCommand({
    ClientId: COGNITO_CONFIG.clientId || '',
    Username: username,
    Password: password,
    SecretHash: secretHash,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
    ],
  });

  try {
    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    console.error("Error signing up:", error);
    throw error;
  }
}

export async function signIn(username: string, password: string) {
  const secretHash = calculateSecretHash(username);
  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: COGNITO_CONFIG.clientId || '',
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
      SECRET_HASH: secretHash,
    },
  });

  try {
    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
}

export async function signOut(accessToken: string) {
  const command = new GlobalSignOutCommand({
    AccessToken: accessToken,
  });

  try {
    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

export async function confirmSignUp(username: string, code: string) {
  const secretHash = calculateSecretHash(username);
  const command = new ConfirmSignUpCommand({
    ClientId: COGNITO_CONFIG.clientId || '',
    Username: username,
    ConfirmationCode: code,
    SecretHash: secretHash,
  });

  try {
    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    console.error("Error confirming sign up:", error);
    throw error;
  }
}