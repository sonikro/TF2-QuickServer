export function generateCloudInitScript(params: { dockerComposeYaml: string }): string {
    const { dockerComposeYaml } = params;
    return `#cloud-config

write_files:
  - path: /opt/tf2-quickserver/docker-compose.yml
    permissions: '0644'
    owner: root:root
    content: |
${dockerComposeYaml.split('\n').map(line => '      ' + line).join('\n')}
`;
}
