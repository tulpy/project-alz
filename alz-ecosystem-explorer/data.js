// Azure Landing Zones — Ecosystem Explorer
// Original implementation. Data model + Three.js scene.

export const LAYERS = [
  {
    id: 'platform-engineering',
    name: 'Platform Engineering',
    tagline: 'Engineering workflows that build and evolve the platform',
    color: 0xc1335a,
    y: 0,
    components: [
      {
        id: 'github',
        name: 'GitHub',
        icon: 'hub',
        summary: 'Repositories and automation for platform infrastructure and engineering workflows.',
        details: 'GitHub repositories and Actions workflows version-control platform code, validate infrastructure changes, and automate repeatable deployments into Azure landing zones.',
        tags: ['Source control', 'GitHub Actions', 'Infrastructure as code'],
        connections: ['azure-rbac', 'subscription-vending']
      },
      {
        id: 'azure-devops',
        name: 'Azure DevOps',
        icon: 'vending',
        summary: 'Boards, repositories, and pipelines coordinate platform delivery.',
        details: 'Azure Boards, Repos, and Pipelines help platform teams plan work, manage infrastructure code, and automate validated deployments across landing zones.',
        tags: ['Azure Repos', 'Pipelines', 'Platform delivery'],
        connections: ['azure-rbac', 'subscription-vending']
      }
    ]
  },
  {
    id: 'platform-services',
    name: 'Platform Services',
    tagline: 'Tenant-wide guardrails that govern everything above',
    color: 0xc13186,
    y: 1,
    components: [
      {
        id: 'management-groups',
        name: 'Management Groups',
        icon: 'hierarchy',
        summary: 'Hierarchy above subscriptions used to apply policy and access controls consistently at scale.',
        details: 'A management group tree (Root → Platform / Landing zones / Sandbox / Decommissioned) lets you assign Azure Policy and access-control roles at a high level and inherit them down to every subscription placed underneath.',
        tags: ['Governance', 'Hierarchy', 'Inheritance'],
        connections: ['azure-policy', 'azure-rbac', 'subscription-vending']
      },
      {
        id: 'azure-policy',
        name: 'Azure Policy',
        icon: 'shield',
        summary: 'Guardrails and initiatives that enforce compliance across every landing zone.',
        details: 'Policy definitions and initiatives (e.g. allowed regions, required tags, diagnostic settings) are assigned at management-group scope so every platform and application landing zone inherits the same guardrails automatically.',
        tags: ['Guardrails', 'Compliance', 'Initiatives'],
        connections: ['management-groups', 'connectivity', 'spoke-networking']
      },
      {
        id: 'azure-rbac',
        name: 'Identity & Access Management',
        icon: 'key',
        summary: 'Microsoft Entra identities and Azure role assignments secure access across the platform.',
        details: 'Microsoft Entra ID provides identities, while Azure role-based access control assigns built-in or custom roles at management-group, subscription, resource-group, and resource scopes. This separates platform-owner duties from application-owner duties while enforcing least privilege.',
        tags: ['Microsoft Entra ID', 'Azure RBAC', 'Least privilege'],
        connections: ['management-groups', 'identity']
      }
    ]
  },
  {
    id: 'platform-landing-zones',
    name: 'Platform Landing Zones',
    tagline: 'Shared platform capabilities consumed by every workload',
    color: 0x6290c9,
    y: 2,
    components: [
      {
        id: 'connectivity',
        name: 'Connectivity LZ',
        icon: 'hub',
        summary: 'Hub network providing shared connectivity, firewalling, and DNS for all spokes.',
        details: 'A hub virtual network hosts Azure Firewall, VPN/ExpressRoute gateways, and private DNS resolution. Application landing zone spokes peer into this hub for controlled north-south and east-west traffic.',
        tags: ['Hub VNet', 'Firewall', 'ExpressRoute/VPN'],
        connections: ['azure-policy', 'spoke-networking', 'management']
      },
      {
        id: 'management',
        name: 'Management LZ',
        icon: 'monitor',
        summary: 'Centralized monitoring, logging, and operations for the whole estate.',
        details: 'Log Analytics workspaces, Azure Monitor, Update/Change management, and Backup are deployed once and consumed by every platform and application landing zone for consistent operations.',
        tags: ['Monitoring', 'Log Analytics', 'Backup'],
        connections: ['connectivity', 'identity', 'subscription-vending']
      },
      {
        id: 'identity',
        name: 'Identity LZ',
        icon: 'id',
        summary: 'Directory services and identity tiering underpinning access to every layer.',
        details: 'Microsoft Entra ID, optional Active Directory Domain Services, Privileged Identity Management, and Conditional Access provide the authentication and authorization backbone consumed by identity and access management and every workload.',
        tags: ['Entra ID', 'PIM', 'Conditional Access'],
        connections: ['azure-rbac', 'management', 'connectivity']
      },
      {
        id: 'security',
        name: 'Security LZ',
        icon: 'shield',
        summary: 'Central security controls and posture management protect the Azure estate.',
        details: 'A centralized security function coordinates cloud security posture, threat detection, vulnerability assessment, and incident response across the platform and landing zones, integrating with identity, monitoring, and policy controls.',
        tags: ['Security posture', 'Threat detection', 'Incident response'],
        connections: ['azure-policy', 'identity', 'management']
      }
    ]
  },
  {
    id: 'application-landing-zones',
    name: 'Application Landing Zones',
    tagline: 'Workload subscriptions and spoke networks where applications run',
    color: 0x522a70,
    y: 3,
    components: [
      {
        id: 'subscription-vending',
        name: 'Subscription Vending',
        icon: 'vending',
        summary: 'Automated, self-service creation of compliant application subscriptions.',
        details: 'A subscription vending process (via APIs, Terraform/Bicep, or Azure landing zone accelerators) creates new subscriptions, places them under the correct management group, applies budgets/quotas, and hands off a ready-to-use landing zone to application teams.',
        tags: ['Automation', 'Self-service', 'Landing zone accelerator'],
        connections: ['management-groups', 'management', 'spoke-networking']
      },
      {
        id: 'spoke-networking',
        name: 'Spoke Networking',
        icon: 'network',
        summary: 'Workload virtual networks peered to the hub for secure, segmented connectivity.',
        details: 'Each application landing zone gets its own spoke VNet with NSGs, route tables forcing traffic through the hub firewall, and private endpoints for PaaS services — peered back to Connectivity for shared egress and inspection.',
        tags: ['Spoke VNet', 'Peering', 'Private endpoints'],
        connections: ['connectivity', 'azure-policy', 'subscription-vending']
      }
    ]
  }
];

export function findComponent(id) {
  for (const layer of LAYERS) {
    const c = layer.components.find(c => c.id === id);
    if (c) return { layer, component: c };
  }
  return null;
}

export function componentColor(layer) {
  return layer.color;
}
