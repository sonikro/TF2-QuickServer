package oracle

import (
	"encoding/base64"
	fmt "fmt"
	"os"
	"path/filepath"
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
	ociConfigFilePath := filepath.Join(homeDir, "/.oci/config")
	ociPrivateKeyFilePath := filepath.Join(homeDir, "/.oci/oci_api_key.pem")
	ociFolder := filepath.Join(homeDir, ".oci")
	if err := fs.MkdirAll(ociFolder, 0755); err != nil {
		return fmt.Errorf("[Oracle] Failed to create .oci directory: %v", err)
	}

	// Modify the key_file field in the config to point to ociPrivateKeyFilePath
	configStr := string(decodedOciConfigFile)
	keyFileLine := "key_file = " + ociPrivateKeyFilePath
	foundKeyFile := false
	newConfigLines := []string{}
	for _, line := range splitLines(configStr) {
		if len(line) >= 8 && line[:8] == "key_file" {
			newConfigLines = append(newConfigLines, keyFileLine)
			foundKeyFile = true
		} else {
			newConfigLines = append(newConfigLines, line)
		}
	}
	if !foundKeyFile {
		// If key_file is not present, add it to the end
		newConfigLines = append(newConfigLines, keyFileLine)
	}
	finalConfig := joinLines(newConfigLines)

	// Print the final config to stdout for debugging
	fmt.Println("[Oracle] Final OCI config file content:")
	fmt.Println(finalConfig)

	if err := fs.WriteFile(ociConfigFilePath, []byte(finalConfig), 0644); err != nil {
		return fmt.Errorf("[Oracle] Failed to write OCI config file: %v", err)
	}
	if err := fs.WriteFile(ociPrivateKeyFilePath, decodedOciPrivateKeyFile, 0600); err != nil {
		return fmt.Errorf("[Oracle] Failed to write OCI private key file: %v", err)
	}
	fmt.Println("[Oracle] OCI credentials setup completed successfully.")

	return nil
}

// splitLines splits a string into lines, handling both \n and \r\n.
func splitLines(s string) []string {
	lines := []string{}
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			line := s[start:i]
			if len(line) > 0 && line[len(line)-1] == '\r' {
				line = line[:len(line)-1]
			}
			lines = append(lines, line)
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
}

// joinLines joins lines with \n.
func joinLines(lines []string) string {
	if len(lines) == 0 {
		return ""
	}
	result := lines[0]
	for i := 1; i < len(lines); i++ {
		result += "\n" + lines[i]
	}
	return result
}
