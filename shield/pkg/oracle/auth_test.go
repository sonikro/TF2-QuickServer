package oracle

import (
	"encoding/base64"
	"errors"
	"os"
	"testing"
)

type mockFileSystem struct {
	MkdirAllFunc    func(path string, perm os.FileMode) error
	WriteFileFunc   func(filename string, data []byte, perm os.FileMode) error
	UserHomeDirFunc func() (string, error)
}

func (m *mockFileSystem) MkdirAll(path string, perm os.FileMode) error {
	return m.MkdirAllFunc(path, perm)
}
func (m *mockFileSystem) WriteFile(filename string, data []byte, perm os.FileMode) error {
	return m.WriteFileFunc(filename, data, perm)
}
func (m *mockFileSystem) UserHomeDir() (string, error) {
	return m.UserHomeDirFunc()
}
func TestSetupOciCredentials(t *testing.T) {
	config := []byte("[DEFAULT]\nuser=ocid1.user.oc1..example")
	key := []byte("-----BEGIN PRIVATE KEY-----\nkeydata\n-----END PRIVATE KEY-----")
	goodConfigB64 := base64.StdEncoding.EncodeToString(config)
	goodKeyB64 := base64.StdEncoding.EncodeToString(key)

	tests := []struct {
		name         string
		setEnv       func()
		fs           *mockFileSystem
		wantErr      bool
		checkContent bool
	}{
		{
			name: "success",
			setEnv: func() {
				os.Setenv("OCI_CONFIG_FILE_CONTENT", goodConfigB64)
				os.Setenv("OCI_PRIVATE_KEY_FILE_CONTENT", goodKeyB64)
			},
			fs: &mockFileSystem{
				MkdirAllFunc: func(path string, perm os.FileMode) error { return nil },
				WriteFileFunc: func(filename string, data []byte, perm os.FileMode) error {
					return nil
				},
				UserHomeDirFunc: func() (string, error) { return "/", nil },
			},
			wantErr:      false,
			checkContent: true,
		},
		{
			name: "missing env",
			setEnv: func() {
				os.Unsetenv("OCI_CONFIG_FILE_CONTENT")
				os.Unsetenv("OCI_PRIVATE_KEY_FILE_CONTENT")
			},
			fs:      &mockFileSystem{},
			wantErr: true,
		},
		{
			name: "decode error",
			setEnv: func() {
				os.Setenv("OCI_CONFIG_FILE_CONTENT", "not-base64")
				os.Setenv("OCI_PRIVATE_KEY_FILE_CONTENT", "not-base64")
			},
			fs:      &mockFileSystem{},
			wantErr: true,
		},
		{
			name: "user home dir error",
			setEnv: func() {
				os.Setenv("OCI_CONFIG_FILE_CONTENT", goodConfigB64)
				os.Setenv("OCI_PRIVATE_KEY_FILE_CONTENT", goodKeyB64)
			},
			fs: &mockFileSystem{
				UserHomeDirFunc: func() (string, error) { return "", errors.New("fail") },
			},
			wantErr: true,
		},
		{
			name: "mkdir error",
			setEnv: func() {
				os.Setenv("OCI_CONFIG_FILE_CONTENT", goodConfigB64)
				os.Setenv("OCI_PRIVATE_KEY_FILE_CONTENT", goodKeyB64)
			},
			fs: &mockFileSystem{
				UserHomeDirFunc: func() (string, error) { return "/home/test", nil },
				MkdirAllFunc:    func(path string, perm os.FileMode) error { return errors.New("fail mkdir") },
			},
			wantErr: true,
		},
		{
			name: "write file error",
			setEnv: func() {
				os.Setenv("OCI_CONFIG_FILE_CONTENT", goodConfigB64)
				os.Setenv("OCI_PRIVATE_KEY_FILE_CONTENT", goodKeyB64)
			},
			fs: &mockFileSystem{
				UserHomeDirFunc: func() (string, error) { return "/home/test", nil },
				MkdirAllFunc:    func(path string, perm os.FileMode) error { return nil },
				WriteFileFunc:   func(filename string, data []byte, perm os.FileMode) error { return errors.New("fail write") },
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clean up env before and after
			os.Unsetenv("OCI_CONFIG_FILE_CONTENT")
			os.Unsetenv("OCI_PRIVATE_KEY_FILE_CONTENT")
			if tt.setEnv != nil {
				tt.setEnv()
			}
			defer os.Unsetenv("OCI_CONFIG_FILE_CONTENT")
			defer os.Unsetenv("OCI_PRIVATE_KEY_FILE_CONTENT")

			var gotConfig, gotKey []byte
			if tt.checkContent {
				// Wrap WriteFileFunc to capture written data
				orig := tt.fs.WriteFileFunc
				tt.fs.WriteFileFunc = func(filename string, data []byte, perm os.FileMode) error {
					if filename == "/.oci/config" {
						gotConfig = data
					} else if filename == "/.oci/oci_api_key.pem" {
						gotKey = data
					}
					if orig != nil {
						return orig(filename, data, perm)
					}
					return nil
				}
			}

			err := SetupOciCredentials(tt.fs)
			if tt.wantErr && err == nil {
				t.Errorf("expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if tt.checkContent && (!tt.wantErr) {
				configStr := string(gotConfig)
				keyFileLine := "key_file = /.oci/oci_api_key.pem"
				if !containsLine(configStr, keyFileLine) {
					t.Errorf("config file missing or incorrect key_file line: got %q", configStr)
				}
				if string(gotKey) != string(key) {
					t.Errorf("private key file content mismatch")
				}
			}
		})
	}
}

// containsLine checks if a line exists in a multi-line string
func containsLine(s, line string) bool {
	for _, l := range splitLines(s) {
		if l == line {
			return true
		}
	}
	return false
}
