package oracle

import (
	"encoding/base64"
	fmt "fmt"
	"os"
)

type FileSystem interface {
	MkdirAll(path string, perm os.FileMode) error
	WriteFile(filename string, data []byte, perm os.FileMode) error
	UserHomeDir() (string, error)
}

type OSFileSystem struct {
}

func (fs OSFileSystem) MkdirAll(path string, perm os.FileMode) error {
	return os.MkdirAll(path, perm)
}
func (fs OSFileSystem) WriteFile(filename string, data []byte, perm os.FileMode) error {
	return os.WriteFile(filename, data, perm)
}
func (fs OSFileSystem) UserHomeDir() (string, error) {
	return os.UserHomeDir()
}

// SetupOciCredentials sets up the OCI credentials by decoding the base64 encoded content from environment variables
// and writing them to the appropriate files in the user's home directory.
func SetupOciCredentials(fs FileSystem) error {
	fmt.Println("[Oracle] Setting up OCI credentials...")

	ociConfigFileContent := os.Getenv("OCI_CONFIG_FILE_CONTENT")
	ociPrivateKeyFileContent := os.Getenv("OCI_PRIVATE_KEY_FILE_CONTENT")
	if ociConfigFileContent == "" || ociPrivateKeyFileContent == "" {
		return fmt.Errorf("[Oracle] OCI configuration or private key file content is not set in environment variables")
	}

	decodedOciConfigFile, err := base64.StdEncoding.DecodeString(ociConfigFileContent)
	if err != nil {
		return fmt.Errorf("[Oracle] Failed to decode OCI config file content: %v", err)
	}
	decodedOciPrivateKeyFile, err := base64.StdEncoding.DecodeString(ociPrivateKeyFileContent)
	if err != nil {
		return fmt.Errorf("[Oracle] Failed to decode OCI private key file content: %v", err)
	}
	// Write the decoded content to temporary files
	homeDir, err := fs.UserHomeDir()
	if err != nil {
		return fmt.Errorf("[Oracle] Failed to get user home directory: %v", err)
	}
	ociConfigFilePath := homeDir + "/.oci/config"
	ociPrivateKeyFilePath := homeDir + "/.oci/oci_api_key.pem"
	if err := fs.MkdirAll(homeDir+"/.oci", 0755); err != nil {
		return fmt.Errorf("[Oracle] Failed to create .oci directory: %v", err)
	}
	if err := fs.WriteFile(ociConfigFilePath, decodedOciConfigFile, 0644); err != nil {
		return fmt.Errorf("[Oracle] Failed to write OCI config file: %v", err)
	}
	if err := fs.WriteFile(ociPrivateKeyFilePath, decodedOciPrivateKeyFile, 0600); err != nil {
		return fmt.Errorf("[Oracle] Failed to write OCI private key file: %v", err)
	}
	fmt.Println("[Oracle] OCI credentials setup completed successfully.")

	return nil
}
