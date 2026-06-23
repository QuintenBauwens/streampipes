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

export interface OpcuaBrowseDialogData {
    device: SpDevice;
    description: AdapterDescription;
    /** Previously selected node names (to pre-check) */
    selectedNodeNames?: string[];
}

@Component({
    selector: 'sp-opcua-browse-dialog',
    templateUrl: './opcua-browse-dialog.component.html',
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

    selectedNodeNames: Set<string> = new Set();

    /** Tracks which node IDs have already had children fetched. */
    private fetchedNodeIds = new Set<string>();

    /** Must return node.children directly (no ?? []) so MatTree distinguishes null from empty. */
    childrenAccessor = (node: TreeInputNode) => node.children;

    dataSource = new MatTreeNestedDataSource<TreeInputNode>();

    hasChild = (_: number, node: TreeInputNode) => !node.dataNode;

    ngOnInit(): void {
        if (this.data.selectedNodeNames?.length) {
            this.selectedNodeNames = new Set(this.data.selectedNodeNames);
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
     * Called on expand button click — mirrors StaticTreeInputBrowseNodesComponent exactly.
     * matTreeNodeToggle fires before (click), so tree.isExpanded(node) is already the
     * new state when this handler runs.
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

    isSelected(node: TreeInputNode): boolean {
        return this.selectedNodeNames.has(node.internalNodeName);
    }

    toggleNode(node: TreeInputNode): void {
        const id = node.internalNodeName;
        if (this.selectedNodeNames.has(id)) {
            this.selectedNodeNames.delete(id);
        } else {
            this.selectedNodeNames.add(id);
        }
    }

    confirm(): void {
        this.dialogRef.close([...this.selectedNodeNames]);
    }

    cancel(): void {
        this.dialogRef.close(null);
    }
}
