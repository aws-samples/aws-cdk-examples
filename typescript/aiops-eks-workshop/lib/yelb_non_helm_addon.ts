// lib/yelb_non_helm_addon.ts
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { setPath } from '@aws-quickstart/eks-blueprints/dist/utils/object-utils';
import { KubernetesManifest, KubernetesPatch } from "aws-cdk-lib/aws-eks";
import { loadYaml, readYamlDocument } from "../lib/utils/yaml-utils";

export class YelbNonHelmAddOn implements blueprints.ClusterAddOn {

   deploy(clusterInfo: blueprints.ClusterInfo): void {
        const cluster = clusterInfo.cluster;
        
        const namespace = {
            "apiVersion": "v1",
            "kind": "Namespace",
            "metadata": {
                "name": "yelb"
            }
        }

        const db_deployment = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "namespace": "yelb",
                "name": "yelb-db"
            },
            "spec": {
                "replicas": 1,
                "selector": {
                    "matchLabels": {
                        "app": "yelb-db",
                        "tier": "backenddb"
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": "yelb-db",
                            "tier": "backenddb"
                        }
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": "yelb-db",
                                "image": "mreferre/yelb-db:0.5",
                                "ports": [
                                    {
                                        "containerPort": 5432
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }
        
        const db_service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "namespace": "yelb",
                "name": "yelb-db",
                "labels": {
                    "app": "yelb-db",
                    "tier": "backenddb"
                }
            },
            "spec": {
                "type": "ClusterIP",
                "ports": [
                    {
                        "port": 5432
                    }
                ],
                "selector": {
                    "app": "yelb-db",
                    "tier": "backenddb"
                }
            }
        }
        
        const redis_deployment = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "namespace": "yelb",
                "name": "redis-server"
            },
            "spec": {
                "selector": {
                    "matchLabels": {
                        "app": "redis-server",
                        "tier": "cache"
                    }
                },
                "replicas": 1,
                "template": {
                    "metadata": {
                        "labels": {
                            "app": "redis-server",
                            "tier": "cache"
                        }
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": "redis-server",
                                "image": "redis:4.0.2",
                                "ports": [
                                    {
                                        "containerPort": 6379
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }
        const redis_service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "namespace": "yelb",
                "name": "redis-server",
                "labels": {
                    "app": "redis-server",
                    "tier": "cache"
                }
            },
            "spec": {
                "type": "ClusterIP",
                "ports": [
                    {
                        "port": 6379
                    }
                ],
                "selector": {
                    "app": "redis-server",
                    "tier": "cache"
                }
            }
        }
        
        const app_deployment = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "namespace": "yelb",
                "name": "yelb-appserver"
            },
            "spec": {
                "replicas": 1,
                "selector": {
                    "matchLabels": {
                        "app": "yelb-appserver",
                        "tier": "middletier"
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": "yelb-appserver",
                            "tier": "middletier"
                        }
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": "yelb-appserver",
                                "image": "mreferre/yelb-appserver:0.5",
                                "ports": [
                                    {
                                        "containerPort": 4567
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }
        const app_service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "namespace": "yelb",
                "name": "yelb-appserver",
                "labels": {
                    "app": "yelb-appserver",
                    "tier": "middletier"
                }
            },
            "spec": {
                "type": "ClusterIP",
                "ports": [
                    {
                        "port": 4567
                    }
                ],
                "selector": {
                    "app": "yelb-appserver",
                    "tier": "middletier"
                }
            }
        }
        
        const ui_deployment = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "namespace": "yelb",
                "name": "yelb-ui"
            },
            "spec": {
                "replicas": 1,
                "selector": {
                    "matchLabels": {
                        "app": "yelb-ui",
                        "tier": "frontend"
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": "yelb-ui",
                            "tier": "frontend"
                        }
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": "yelb-ui",
                                "image": "mreferre/yelb-ui:0.7",
                                "ports": [
                                    {
                                        "containerPort": 80
                                    }
                                ],
                                "resources": {
                                    "limits": {
                                        "cpu": "50m",
                                        "memory": "32Mi"
                                    },
                                    "requests": {
                                        "cpu": "25m",
                                        "memory": "16Mi"
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        }
        const ui_service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "namespace": "yelb",
                "name": "yelb-ui",
                "labels": {
                    "app": "yelb-ui",
                    "tier": "frontend"
                }
            },
            "spec": {
                "type": "LoadBalancer",
                "ports": [
                    {
                        "port": 80,
                        "protocol": "TCP",
                        "targetPort": 80
                    }
                ],
                "selector": {
                    "app": "yelb-ui",
                    "tier": "frontend"
                }
            }
        }

        const db_latency = {
            "apiVersion": "chaos-mesh.org/v1alpha1",
            "kind": "NetworkChaos",
            "metadata": {
                "name": "latency-db"
            },
            "spec": {
                "action": "delay",
                "delay": {
                    "correlation": "0",
                    "jitter": "0ms",
                    "latency": "300ms"
                },
                "direction": "to",
                "duration": "1h",
                "mode": "all",
                "selector": {
                    "labelSelectors": {
                        "tier": "backenddb"
                    },
                    "namespaces": [
                        "yelb"
                    ]
                }
            }
        }
        
        const ui_burn_cpu = {
          "apiVersion": "chaos-mesh.org/v1alpha1",
          "kind": "StressChaos",
          "metadata": {
            "name": "ui-burn-cpu"
          },
          "spec": {
            "mode": "all",
            "selector": {
              "namespaces": [
                "yelb"
              ],
              "labelSelectors": {
                "tier": "frontend"
              }
            },
            "stressors": {
              "cpu": {
                "workers": 2,
                "load": 100,
                "options": [
                  "--cpu 2",
                  "--hdd 1"
                ]
              }
            },
            "duration": "6h"
          }
        }
        
        new KubernetesManifest(cluster.stack, "yelb-manifest", {
            cluster,
            manifest: [
                namespace,
                db_deployment,
                db_service,
                redis_deployment, 
                redis_service, 
                app_deployment,
                app_service,
                ui_deployment, 
                ui_service,
                
                // ChaosMesh fault injections
                db_latency,
                ui_burn_cpu
                ],
            overwrite: true
        });
        
    }
}