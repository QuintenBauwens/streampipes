/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
    AdapterDescription,
    SpDevice,
    TreeInputNode,
} from '@streampipes/platform-services';
import { OpcuaBrowseService } from '../../opcua-browse.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatDivider } from '@angular/material/divider';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import {
    MatNestedTreeNode,
    MatTree,
    MatTreeNestedDataSource,
    MatTreeNode,
    MatTreeNodeDef,
    MatTreeNodeOutlet,
    MatTreeNodeToggle,
} from '@angular/material/tree';
import {
    FlexDirective,
    LayoutAlignDirective,
    LayoutDirective,
} from '@ngbracket/ngx-layout/flex';
import { TranslatePipe } from '@ngx-translate/core';
import { KeyValuePipe } from '@angular/common';

export interface OpcuaBrowseDialogData {
    device: SpDevice;
    description: AdapterDescription;
    /** Previously selected node entries — either "nodeName=id" or bare node IDs. */
    selectedNodeNames?: string[];
}

@Component({
    selector: 'sp-opcua-browse-dialog',
    templateUrl: './opcua-browse-dialog.component.html',
    styles: [
        `
            .opcua-node-tree .mat-nested-tree-node div[role='group'] {
                padding-left: 20px;
            }
            .opcua-node-tree div[role='group'] > .mat-tree-node {
                padding-left: 20px;
            }
            .opcua-node-tree .mat-nested-tree-node {
                min-height: 30px;
            }
            .node-preview {
                background: var(--color-bg-2, #f5f5f5);
                border-top: 1px solid var(--color-bg-3, #e0e0e0);
                padding: 10px 12px;
                font-size: 12px;
            }
            .node-preview-key {
                color: var(--fg-muted, #888);
                min-width: 100px;
            }
            .preview-metadata {
                display: grid;
                grid-template-columns: minmax(8rem, 12rem) 1fr;
                gap: 2px 8px;
                margin-top: 6px;
            }
            .node-row-clickable {
                cursor: pointer;
            }
            .node-row-clickable:hover {
                background: var(--color-bg-2, #f5f5f5);
            }
        `,
    ],
    imports: [
        MatProgressSpinner,
        MatDivider,
        MatButton,
        MatIconButton,
        MatCheckbox,
        MatIcon,
        MatTree,
        MatTreeNode,
        MatTreeNodeDef,
        MatNestedTreeNode,
        MatTreeNodeToggle,
        MatTreeNodeOutlet,
        LayoutDirective,
        LayoutAlignDirective,
        FlexDirective,
        TranslatePipe,
        KeyValuePipe,
    ],
})
export class OpcuaBrowseDialogComponent implements OnInit {
    private browseService = inject(OpcuaBrowseService);
    private dialogRef = inject(MatDialogRef<OpcuaBrowseDialogComponent>);

    data: OpcuaBrowseDialogData = inject(MAT_DIALOG_DATA);

    @ViewChild('tree') tree: MatTree<TreeInputNode>;

    treeNodes: TreeInputNode[] = [];
    loading = false;
    errorMessage = '';
    errorDetail = '';

    /**
     * Key = internalNodeName, Value = nodeName (human readable).
     * confirm() emits "nodeName=internalNodeName" so the backend parseOpcUaNodeIds
     * splits on the first '=' and gets the full node ID (e.g. ns=2;i=4).
     */
    selectedNodes = new Map<string, string>();

    /** Node currently shown in the details preview panel. */
    previewNode: TreeInputNode | null = null;

    /** Tracks which node IDs have had children fetched already. */
    private fetchedNodeIds = new Set<string>();

    /** Return node.children directly so MatTree can distinguish null (unfetched) from [] (empty). */
    childrenAccessor = (node: TreeInputNode) => node.children;

    dataSource = new MatTreeNestedDataSource<TreeInputNode>();

    hasChild = (_: number, node: TreeInputNode) => !node.dataNode;

    ngOnInit(): void {
        for (const entry of this.data.selectedNodeNames ?? []) {
            if (this.isRawNodeId(entry)) {
                this.selectedNodes.set(entry, entry);
            } else {
                const eq = entry.indexOf('=');
                if (eq > 0) {
                    this.selectedNodes.set(
                        entry.substring(eq + 1),
                        entry.substring(0, eq),
                    );
                } else {
                    this.selectedNodes.set(entry, entry);
                }
            }
        }
        this.loadRootNodes();
    }

    loadRootNodes(): void {
        this.loading = true;
        this.errorMessage = '';
        this.browseService
            .browseNodes(this.data.description, this.data.device)
            .subscribe({
                next: nodes => {
                    this.treeNodes = nodes;
                    this.dataSource.data = nodes;
                    this.loading = false;
                },
                error: err => {
                    const body = err?.error;
                    this.errorMessage =
                        body?.title ??
                        body?.detail ??
                        body?.cause ??
                        body?.message ??
                        `HTTP ${err?.status}: Could not connect to OPC-UA server.`;
                    this.errorDetail =
                        body?.title && body?.detail ? body.detail : '';
                    this.loading = false;
                },
            });
    }

    /**
     * Mirrors StaticTreeInputBrowseNodesComponent: matTreeNodeToggle HostListener fires
     * before the template (click) handler, so tree.isExpanded(node) is the NEW state.
     */
    loadChildren(node: TreeInputNode, expanded: boolean): void {
        if (!expanded) {
            return;
        }
        if (this.fetchedNodeIds.has(node.internalNodeName)) {
            return;
        }
        this.fetchedNodeIds.add(node.internalNodeName);
        this.browseService
            .browseNodes(
                this.data.description,
                this.data.device,
                node.internalNodeName,
            )
            .subscribe({
                next: children => {
                    node.children = children;
                    this.refreshTree();
                },
                error: () => {
                    node.children = [];
                    this.refreshTree();
                },
            });
    }

    refreshTree(): void {
        const data = this.dataSource.data.slice();
        this.dataSource.data = [];
        this.dataSource.data = data;
    }

    showPreview(node: TreeInputNode): void {
        this.previewNode = node;
    }

    isSelected(node: TreeInputNode): boolean {
        return this.selectedNodes.has(node.internalNodeName);
    }

    toggleNode(node: TreeInputNode): void {
        const id = node.internalNodeName;
        if (this.selectedNodes.has(id)) {
            this.selectedNodes.delete(id);
        } else {
            this.selectedNodes.set(id, node.nodeName || id);
        }
        this.previewNode = node;
    }

    /** Emits "nodeName=internalNodeName" strings — backend splits on first '='. */
    confirm(): void {
        const result = [...this.selectedNodes.entries()].map(
            ([id, name]) => `${name}=${id}`,
        );
        this.dialogRef.close(result);
    }

    cancel(): void {
        this.dialogRef.close(null);
    }

    /** Detects bare OPC-UA node IDs (ns=, i=, s=, g=, b=, nsu= prefixes or contains ;). */
    private isRawNodeId(s: string): boolean {
        return s.includes(';') || /^(ns|i|s|g|b|nsu)=/.test(s);
    }
}
